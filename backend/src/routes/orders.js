import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../database.js';

const router = Router();
const orderInput = z.object({
  customerName: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^01[0-9]{9}$/),
  items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(99) })).min(1).max(40),
  deliveryAddress: z.object({ area: z.string().trim().min(2).max(100), postalCode: z.string().trim().min(4).max(12) }),
  deliverySlotId: z.string().uuid(),
  substitutionPreference: z.enum(['refund', 'similar', 'choose_for_me', 'contact_me']).default('refund'),
  paymentMethod: z.literal('cod').default('cod')
});

router.post('/', async (request, response, next) => {
  const result = orderInput.safeParse(request.body);
  if (!result.success) return response.status(400).json({ error: 'Please check your order details.', issues: result.error.flatten().fieldErrors });
  const order = result.data;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const zoneResult = await client.query(
      `SELECT id, delivery_fee_paisa, minimum_order_paisa
       FROM delivery_zones
       WHERE is_active = TRUE AND $1 = ANY(postal_codes)
       LIMIT 1 FOR SHARE`,
      [order.deliveryAddress.postalCode]
    );
    if (!zoneResult.rowCount) {
      const error = new Error('Delivery is not available for this postal code.');
      error.status = 409;
      throw error;
    }
    const zone = zoneResult.rows[0];

    const slotResult = await client.query(
      `UPDATE delivery_slots
       SET booked_count = booked_count + 1
       WHERE id = $1 AND zone_id = $2 AND starts_at > NOW() AND booked_count < capacity
       RETURNING id`,
      [order.deliverySlotId, zone.id]
    );
    if (!slotResult.rowCount) {
      const error = new Error('That delivery slot is no longer available. Please choose another time.');
      error.status = 409;
      throw error;
    }

    const products = new Map();
    let subtotal = 0;
    for (const item of order.items) {
      const productResult = await client.query(
        `SELECT id, name, unit_label, price_paisa FROM products WHERE id = $1 AND is_active = TRUE FOR SHARE`,
        [item.productId]
      );
      if (!productResult.rowCount) {
        const error = new Error('One of the products is no longer available.');
        error.status = 409;
        throw error;
      }
      const product = productResult.rows[0];
      const existing = products.get(item.productId);
      if (existing) existing.quantity += item.quantity;
      else products.set(item.productId, { ...product, quantity: item.quantity, allocations: [] });
      subtotal += product.price_paisa * item.quantity;
    }
    if (subtotal < zone.minimum_order_paisa) {
      const error = new Error(`The minimum order for this area is ৳${Math.ceil(zone.minimum_order_paisa / 100)}.`);
      error.status = 400;
      throw error;
    }

    for (const [productId, product] of products) {
      let remaining = product.quantity;
      const batches = await client.query(
        `SELECT id, quantity, reserved_quantity
         FROM inventory_batches
         WHERE product_id = $1 AND status = 'active'
           AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
           AND quantity > reserved_quantity
         ORDER BY expiry_date ASC NULLS LAST, created_at ASC
         FOR UPDATE`,
        [productId]
      );
      for (const batch of batches.rows) {
        if (!remaining) break;
        const reserved = Math.min(remaining, batch.quantity - batch.reserved_quantity);
        await client.query('UPDATE inventory_batches SET reserved_quantity = reserved_quantity + $1 WHERE id = $2', [reserved, batch.id]);
        product.allocations.push({ batchId: batch.id, quantity: reserved });
        remaining -= reserved;
      }
      if (remaining) {
        const error = new Error(`${product.name} does not have enough fresh stock.`);
        error.status = 409;
        throw error;
      }
    }

    const deliveryFee = subtotal >= 100000 ? 0 : zone.delivery_fee_paisa;
    const total = subtotal + deliveryFee;
    const orderResult = await client.query(
      `INSERT INTO orders (zone_id, delivery_slot_id, status, substitution_preference,
         payment_method, subtotal_paisa, delivery_fee_paisa, total_paisa,
         customer_name, customer_phone, delivery_address)
       VALUES ($1, $2, 'placed', $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
       RETURNING id, order_number, created_at`,
      [zone.id, order.deliverySlotId, order.substitutionPreference, order.paymentMethod,
        subtotal, deliveryFee, total, order.customerName, order.phone, JSON.stringify(order.deliveryAddress)]
    );
    const createdOrder = orderResult.rows[0];

    for (const product of products.values()) {
      const itemResult = await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name_snapshot, unit_label_snapshot,
          quantity, unit_price_paisa, line_total_paisa)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [createdOrder.id, product.id, product.name, product.unit_label, product.quantity,
          product.price_paisa, product.price_paisa * product.quantity]
      );
      for (const allocation of product.allocations) {
        await client.query(
          `INSERT INTO inventory_reservations (order_item_id, product_id, batch_id, quantity)
           VALUES ($1, $2, $3, $4)`,
          [itemResult.rows[0].id, product.id, allocation.batchId, allocation.quantity]
        );
      }
    }
    await client.query('INSERT INTO payments (order_id, provider, status, amount_paisa) VALUES ($1, $2, $3, $4)',
      [createdOrder.id, order.paymentMethod === 'cod' ? 'cash_on_delivery' : null, 'pending', total]);
    await client.query('INSERT INTO deliveries (order_id, status) VALUES ($1, $2)', [createdOrder.id, 'assigned']);
    await client.query('COMMIT');
    response.status(201).json({
      orderId: createdOrder.id,
      orderNumber: `FM-${String(createdOrder.order_number).padStart(6, '0')}`,
      status: 'placed',
      paymentStatus: 'pending',
      subtotal: subtotal / 100,
      deliveryFee: deliveryFee / 100,
      total: total / 100,
      createdAt: createdOrder.created_at
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error.status) return response.status(error.status).json({ error: error.message });
    next(error);
  } finally {
    client.release();
  }
});

export default router;
