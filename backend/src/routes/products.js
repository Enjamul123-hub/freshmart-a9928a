import { Router } from 'express';
import { pool } from '../database.js';

const router = Router();

router.get('/', async (request, response, next) => {
  try {
    const query = String(request.query.q || '').trim();
    const category = String(request.query.category || '').trim();
    const limit = Math.min(Math.max(Number(request.query.limit) || 24, 1), 60);
    const offset = Math.max(Number(request.query.offset) || 0, 0);
    const result = await pool.query(
      `SELECT p.id, p.name, p.slug, p.description, p.brand, p.image_url,
              p.unit_label, p.price_paisa / 100.0 AS price,
              p.compare_at_paisa / 100.0 AS compare_at,
              p.rating, p.review_count, p.is_organic, c.name AS category,
              COALESCE(SUM(ib.quantity - ib.reserved_quantity), 0)::int AS stock
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN inventory_batches ib ON ib.product_id = p.id AND ib.status = 'active'
         AND (ib.expiry_date IS NULL OR ib.expiry_date >= CURRENT_DATE)
       WHERE p.is_active = TRUE
         AND ($1 = '' OR to_tsvector('simple', p.name || ' ' || COALESCE(p.brand, '')) @@ plainto_tsquery('simple', $1))
         AND ($2 = '' OR c.slug = $2 OR c.name ILIKE $2)
       GROUP BY p.id, c.name
       ORDER BY p.name
       LIMIT $3 OFFSET $4`,
      [query, category, limit, offset]
    );
    response.json({ products: result.rows.map((product) => ({ ...product, in_stock: product.stock > 0 })), limit, offset });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (request, response, next) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.name, p.slug, p.description, p.brand, p.image_url,
              p.unit_label, p.price_paisa / 100.0 AS price,
              p.compare_at_paisa / 100.0 AS compare_at,
              p.rating, p.review_count, p.is_organic, c.name AS category
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.is_active = TRUE AND (p.id::text = $1 OR p.slug = $1) LIMIT 1`,
      [request.params.id]
    );
    if (!result.rowCount) return response.status(404).json({ error: 'Product not found.' });
    response.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
