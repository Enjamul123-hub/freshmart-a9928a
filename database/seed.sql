INSERT INTO categories (name, slug, image_url, sort_order) VALUES
  ('Fruits', 'fruits', 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=480&q=80', 1),
  ('Vegetables', 'vegetables', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=480&q=80', 2),
  ('Dairy', 'dairy', 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=480&q=80', 3),
  ('Bakery', 'bakery', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=480&q=80', 4),
  ('Pantry', 'pantry', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=480&q=80', 5),
  ('Household', 'household', 'https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=480&q=80', 6)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (category_id, name, slug, description, brand, image_url, unit_label, price_paisa, compare_at_paisa, rating, review_count, is_organic)
SELECT c.id, p.name, p.slug, p.description, p.brand, p.image_url, p.unit_label, p.price_paisa, p.compare_at_paisa, p.rating, p.review_count, p.is_organic
FROM (VALUES
  ('Fruits','Sweet seasonal mangoes','seasonal-mangoes','Sun-ripened, fragrant and hand-selected this morning.','Local growers','https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=800&q=85','1 kg', 22000, 28000, 4.9, 86, true),
  ('Vegetables','Garden baby spinach','baby-spinach','Tender leaves, freshly picked and ready for your table.','Green patch','https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=800&q=85','250 g', 6500, NULL, 4.8, 42, true),
  ('Dairy','Creamy whole milk','whole-milk','Fresh full-cream milk from a trusted local dairy.','Meadow dairy','https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=800&q=85','1 litre', 10000, 12000, 4.8, 125, false),
  ('Bakery','Slow-rise sourdough','sourdough-loaf','A crisp, flour-dusted loaf baked before sunrise.','Sunday bakehouse','https://images.unsplash.com/photo-1585478259715-876acc5be8eb?auto=format&fit=crop&w=800&q=85','1 loaf', 18000, NULL, 4.9, 63, false),
  ('Pantry','Miniket rice','miniket-rice','A naturally aromatic everyday rice, carefully milled.','Harvest table','https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=85','2 kg', 24500, 28000, 4.7, 94, false),
  ('Vegetables','Heirloom tomatoes','heirloom-tomatoes','Bright, juicy tomatoes from this week’s local harvest.','Green patch','https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=800&q=85','500 g', 9500, NULL, 4.8, 31, true),
  ('Dairy','Free-range brown eggs','brown-eggs','Gently packed eggs from small, open-range farms.','Meadow dairy','https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=800&q=85','6 pieces', 10500, NULL, 4.9, 108, false),
  ('Fruits','Sweet green grapes','green-grapes','Crisp, seedless and just the right kind of sweet.','Local growers','https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=800&q=85','500 g', 16000, 19000, 4.7, 56, false)
) AS p(category, name, slug, description, brand, image_url, unit_label, price_paisa, compare_at_paisa, rating, review_count, is_organic)
JOIN categories c ON c.name = p.category
ON CONFLICT (slug) DO NOTHING;

INSERT INTO inventory_batches (product_id, batch_number, quantity, expiry_date)
SELECT id, 'FM-DEMO-' || UPPER(LEFT(slug, 5)), 40, CURRENT_DATE + INTERVAL '21 days'
FROM products
ON CONFLICT (product_id, batch_number) DO NOTHING;

INSERT INTO delivery_zones (name, postal_codes, delivery_fee_paisa, minimum_order_paisa, estimated_minutes)
SELECT 'Dhaka Central', ARRAY['1207','1212'], 5000, 50000, 60
WHERE NOT EXISTS (SELECT 1 FROM delivery_zones WHERE name = 'Dhaka Central');

INSERT INTO delivery_slots (zone_id, starts_at, ends_at, capacity)
SELECT zone.id,
       date_trunc('day', NOW()) + INTERVAL '1 day' + (slot.hour_offset || ' hours')::interval,
       date_trunc('day', NOW()) + INTERVAL '1 day' + ((slot.hour_offset + 2) || ' hours')::interval,
       20
FROM delivery_zones zone
CROSS JOIN (VALUES (10), (12), (14), (16)) AS slot(hour_offset)
WHERE zone.name = 'Dhaka Central'
ON CONFLICT (zone_id, starts_at) DO NOTHING;
