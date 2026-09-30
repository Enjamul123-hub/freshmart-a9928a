(() => {
  const API_BASE = window.FRESHMART_API_URL || 'http://localhost:4000/api';
  const sampleProducts = [
    { id: 'mango', name: 'Sweet seasonal mangoes', category: 'Fruits', brand: 'Local growers', description: 'Sun-ripened, fragrant and hand-selected this morning.', image_url: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=800&q=85', unit_label: '1 kg', price: 220, compare_at: 280, rating: 4.9, review_count: 86, in_stock: true, is_organic: true },
    { id: 'spinach', name: 'Garden baby spinach', category: 'Vegetables', brand: 'Green patch', description: 'Tender leaves, freshly picked and ready for your table.', image_url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=800&q=85', unit_label: '250 g', price: 65, compare_at: null, rating: 4.8, review_count: 42, in_stock: true, is_organic: true },
    { id: 'milk', name: 'Creamy whole milk', category: 'Dairy', brand: 'Meadow dairy', description: 'Fresh full-cream milk from a trusted local dairy.', image_url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=800&q=85', unit_label: '1 litre', price: 100, compare_at: 120, rating: 4.8, review_count: 125, in_stock: true, is_organic: false },
    { id: 'sourdough', name: 'Slow-rise sourdough', category: 'Bakery', brand: 'Sunday bakehouse', description: 'A crisp, flour-dusted loaf baked before sunrise.', image_url: 'https://images.unsplash.com/photo-1585478259715-876acc5be8eb?auto=format&fit=crop&w=800&q=85', unit_label: '1 loaf', price: 180, compare_at: null, rating: 4.9, review_count: 63, in_stock: true, is_organic: false },
    { id: 'rice', name: 'Miniket rice', category: 'Pantry', brand: 'Harvest table', description: 'A naturally aromatic everyday rice, carefully milled.', image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=85', unit_label: '2 kg', price: 245, compare_at: 280, rating: 4.7, review_count: 94, in_stock: true, is_organic: false },
    { id: 'tomatoes', name: 'Heirloom tomatoes', category: 'Vegetables', brand: 'Green patch', description: 'Bright, juicy tomatoes from this week’s local harvest.', image_url: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=800&q=85', unit_label: '500 g', price: 95, compare_at: null, rating: 4.8, review_count: 31, in_stock: true, is_organic: true },
    { id: 'eggs', name: 'Free-range brown eggs', category: 'Dairy', brand: 'Meadow dairy', description: 'Gently packed eggs from small, open-range farms.', image_url: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=800&q=85', unit_label: '6 pieces', price: 105, compare_at: null, rating: 4.9, review_count: 108, in_stock: true, is_organic: false },
    { id: 'grapes', name: 'Sweet green grapes', category: 'Fruits', brand: 'Local growers', description: 'Crisp, seedless and just the right kind of sweet.', image_url: 'https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=800&q=85', unit_label: '500 g', price: 160, compare_at: 190, rating: 4.7, review_count: 56, in_stock: true, is_organic: false },
    { id: 'yogurt', name: 'Thick set yoghurt', category: 'Dairy', brand: 'Meadow dairy', description: 'Slow cultured for a lovely, gentle tang.', image_url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=85', unit_label: '400 g', price: 125, compare_at: null, rating: 4.8, review_count: 47, in_stock: true, is_organic: false },
    { id: 'carrots', name: 'Sweet little carrots', category: 'Vegetables', brand: 'Green patch', description: 'Young, sweet carrots with their green tops still on.', image_url: 'https://images.unsplash.com/photo-1445282768818-728615cc910a?auto=format&fit=crop&w=800&q=85', unit_label: '500 g', price: 75, compare_at: 90, rating: 4.6, review_count: 28, in_stock: true, is_organic: true },
    { id: 'bananas', name: 'Nolen banana bunch', category: 'Fruits', brand: 'Local growers', description: 'Naturally sweet bananas, perfect for the week ahead.', image_url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=800&q=85', unit_label: '6 pieces', price: 80, compare_at: null, rating: 4.8, review_count: 72, in_stock: true, is_organic: false },
    { id: 'honey', name: 'Wildflower honey', category: 'Pantry', brand: 'Harvest table', description: 'Small-batch honey with a bright, floral finish.', image_url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=85', unit_label: '250 g', price: 260, compare_at: 310, rating: 4.9, review_count: 39, in_stock: true, is_organic: true }
  ];

  async function getProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    try {
      const response = await fetch(`${API_BASE}/products${query ? `?${query}` : ''}`, { signal: AbortSignal.timeout(1400) });
      if (!response.ok) throw new Error('Catalog request failed');
      const payload = await response.json();
      return payload.products || payload;
    } catch {
      return sampleProducts;
    }
  }

  async function placeOrder(order) {
    const response = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    });
    if (!response.ok) throw new Error('The order service is not connected yet.');
    return response.json();
  }

  window.FreshMartAPI = { getProducts, placeOrder, sampleProducts };
})();
