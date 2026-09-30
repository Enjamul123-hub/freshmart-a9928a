(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const money = (amount) => `৳${Number(amount || 0).toLocaleString('en-BD', { maximumFractionDigits: 0 })}`;
  const readStorage = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  };

  const state = {
    products: [],
    cart: readStorage('freshmart-cart', {}),
    wishlist: readStorage('freshmart-wishlist', []),
    location: localStorage.getItem('freshmart-location') || 'Dhaka 1207',
    selected: {},
    category: 'All',
    query: '',
    dealsOnly: false,
    stockOnly: false,
    wishlistOnly: false
  };
  const categories = [
    { name: 'Fruits', count: 'In season', image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=480&q=80' },
    { name: 'Vegetables', count: 'Picked today', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=480&q=80' },
    { name: 'Dairy', count: 'The daily things', image: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=480&q=80' },
    { name: 'Bakery', count: 'Baked this morning', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=480&q=80' },
    { name: 'Pantry', count: 'Keep the cupboard', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=480&q=80' },
    { name: 'Household', count: 'For a happy home', image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=480&q=80' }
  ];
  let toastTimer;

  function refreshIcons() {
    window.lucide?.createIcons({ attrs: { 'stroke-width': 1.8 } });
  }

  function persist() {
    localStorage.setItem('freshmart-cart', JSON.stringify(state.cart));
    localStorage.setItem('freshmart-wishlist', JSON.stringify(state.wishlist));
    updateCartSummary();
  }

  function productById(id) {
    return state.products.find((product) => String(product.id) === String(id));
  }

  function countItems() {
    return Object.values(state.cart).reduce((total, quantity) => total + quantity, 0);
  }

  function cartTotal() {
    return Object.entries(state.cart).reduce((total, [id, quantity]) => total + (productById(id)?.price || 0) * quantity, 0);
  }

  function updateCartSummary() {
    const itemCount = countItems();
    const total = cartTotal();
    $('#cart-count').textContent = itemCount;
    $('#cart-count').hidden = itemCount === 0;
    $('#mobile-cart-count').textContent = itemCount;
    $('#mobile-cart-count').hidden = itemCount === 0;
    $('#wishlist-count').textContent = state.wishlist.length;
    $('#wishlist-count').hidden = state.wishlist.length === 0;
    $('#drawer-count').textContent = `(${itemCount})`;
    $('#drawer-subtotal').textContent = money(total);
    const delivery = total >= 1000 ? 0 : 50;
    const checkoutSummary = $('.checkout-summary');
    if (!$('#checkout-subtotal')) {
      checkoutSummary.innerHTML = '<div><span>Groceries</span><strong id="checkout-subtotal">৳0</strong></div><div><span>Delivery</span><strong id="checkout-delivery">৳50</strong></div><div class="checkout-grand-total"><span>Estimated total</span><strong id="checkout-total">৳0</strong></div>';
    }
    $('#checkout-subtotal').textContent = money(total);
    $('#checkout-delivery').textContent = delivery ? money(delivery) : 'On us';
    $('#checkout-total').textContent = money(total + delivery);
    $('#sticky-cart-items').textContent = `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`;
    $('#sticky-cart-total').textContent = money(total);
    $('#sticky-cart').hidden = itemCount === 0;
    $('#drawer-empty').classList.toggle('show', itemCount === 0);
    $('#drawer-bottom').hidden = itemCount === 0;
    const progress = Math.min((total / 1000) * 100, 100);
    $('#delivery-progress-fill').style.width = `${progress}%`;
    $('#delivery-progress-message').textContent = total >= 1000 ? 'Lovely, delivery is on us!' : `Add ${money(1000 - total)} for free delivery`;
  }

  function renderCategories() {
    $('#category-grid').innerHTML = categories.map((category) => `
      <button class="category-card" type="button" data-category-card="${category.name}" aria-label="Shop ${category.name}">
        <span class="category-image"><img src="${category.image}" alt="Fresh ${category.name.toLowerCase()}" loading="lazy" /></span>
        <span class="category-copy"><span><strong>${category.name}</strong><small>${category.count}</small></span><span class="category-arrow"><i data-lucide="arrow-up-right"></i></span></span>
      </button>`).join('');
    $('#filter-categories').innerHTML = ['All', ...categories.map((item) => item.name)].map((name) => {
      const count = name === 'All' ? state.products.length : state.products.filter((product) => product.category?.toLowerCase() === name.toLowerCase()).length;
      return `<label class="check-option"><input type="radio" name="category-filter" value="${name}" ${state.category === name ? 'checked' : ''} /><span class="checkmark"></span>${name === 'All' ? 'All departments' : name}<span class="filter-count">${count}</span></label>`;
    }).join('');
    refreshIcons();
  }

  function visibleProducts() {
    let products = state.products.filter((product) => {
      const matchesCategory = state.category === 'All' || product.category?.toLowerCase() === state.category.toLowerCase();
      const searchText = `${product.name} ${product.brand || ''} ${product.category || ''}`.toLowerCase();
      const matchesSearch = !state.query || searchText.includes(state.query.toLowerCase());
      const matchesDeal = !state.dealsOnly || (product.compare_at && product.compare_at > product.price);
      const matchesStock = !state.stockOnly || product.in_stock !== false;
      const matchesWishlist = !state.wishlistOnly || state.wishlist.includes(String(product.id));
      return matchesCategory && matchesSearch && matchesDeal && matchesStock && matchesWishlist;
    });
    const sort = $('#sort-select').value;
    if (sort === 'price-asc') products.sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') products.sort((a, b) => b.price - a.price);
    if (sort === 'rating') products.sort((a, b) => b.rating - a.rating);
    return products;
  }

  function renderProducts() {
    const products = visibleProducts();
    const labels = [];
    if (state.category !== 'All') labels.push(state.category);
    if (state.query) labels.push(`“${state.query}”`);
    if (state.dealsOnly) labels.push('On offer');
    if (state.wishlistOnly) labels.push('Your wishlist');
    $('#result-count').textContent = `${products.length} ${products.length === 1 ? 'pick' : 'picks'}`;
    $('#active-filter-label').textContent = labels.length ? labels.join(' · ') : 'Everything fresh, all in one place';
    $('#product-grid').hidden = products.length === 0;
    $('#empty-results').hidden = products.length > 0;
    $('#product-grid').innerHTML = products.map((product) => {
      const discount = product.compare_at ? Math.round((1 - product.price / product.compare_at) * 100) : 0;
      const isFavorite = state.wishlist.includes(String(product.id));
      const quantity = state.selected[product.id] || 1;
      return `<article class="product-card" data-product-card="${product.id}">
        <div class="product-image"><img src="${product.image_url}" alt="${product.name}" loading="lazy" />${discount ? `<span class="sale-tag">${discount}% OFF</span>` : ''}${product.is_organic ? '<span class="organic-tag">Grown with care</span>' : ''}<button type="button" class="favorite-button ${isFavorite ? 'is-favorite' : ''}" data-favorite="${product.id}" aria-label="${isFavorite ? 'Remove from' : 'Add to'} wishlist"><i data-lucide="heart"></i></button></div>
        <div class="product-info"><p class="product-brand">${product.brand || product.category || 'FreshMart pick'}</p><h3 class="product-name" title="${product.name}">${product.name}</h3><span class="product-unit">${product.unit_label}</span><div class="product-rating" aria-label="Rated ${product.rating} out of 5">★ <span>${product.rating} <span>(${product.review_count || 0})</span></span></div><div class="product-price-row"><strong class="product-price">${money(product.price)}</strong>${product.compare_at ? `<span class="product-compare">${money(product.compare_at)}</span>` : ''}</div><span class="stock-label">${product.in_stock === false ? 'Currently unavailable' : 'Fresh & ready'}</span><div class="product-card-actions"><div class="quantity-control"><button type="button" data-quantity="minus" data-id="${product.id}" aria-label="Decrease quantity"><i data-lucide="minus"></i></button><span>${quantity}</span><button type="button" data-quantity="plus" data-id="${product.id}" aria-label="Increase quantity"><i data-lucide="plus"></i></button></div><button type="button" class="add-button" data-add="${product.id}" ${product.in_stock === false ? 'disabled' : ''}><i data-lucide="plus"></i> Add</button></div></div>
      </article>`;
    }).join('');
    refreshIcons();
  }

  function renderReorder() {
    const usuals = ['milk', 'eggs', 'rice', 'sourdough', 'mango'].map(productById).filter(Boolean);
    $('#reorder-items').innerHTML = usuals.slice(0, 4).map((product) => `<div class="reorder-chip"><img src="${product.image_url}" alt="" loading="lazy" /><span>${product.name.split(' ').slice(0, 2).join(' ')}</span><button type="button" data-reorder-add="${product.id}" aria-label="Add ${product.name} to basket"><i data-lucide="plus"></i></button></div>`).join('');
    refreshIcons();
  }

  function renderDrawer() {
    const entries = Object.entries(state.cart).filter(([id, quantity]) => quantity > 0 && productById(id));
    $('#drawer-items').innerHTML = entries.map(([id, quantity]) => {
      const product = productById(id);
      return `<div class="drawer-item"><img src="${product.image_url}" alt="${product.name}" /><div><h3>${product.name}</h3><small>${product.unit_label} · ${money(product.price)}</small><div class="quantity-control"><button type="button" data-cart-quantity="minus" data-id="${id}" aria-label="Remove one"><i data-lucide="minus"></i></button><span>${quantity}</span><button type="button" data-cart-quantity="plus" data-id="${id}" aria-label="Add one"><i data-lucide="plus"></i></button></div></div><strong class="drawer-item-price">${money(product.price * quantity)}</strong></div>`;
    }).join('');
    refreshIcons();
  }

  function updateView() {
    renderCategories();
    renderProducts();
    renderReorder();
    updateCartSummary();
  }

  function addToCart(id, quantity = 1) {
    if (!productById(id)) return;
    state.cart[id] = (state.cart[id] || 0) + quantity;
    persist();
    renderDrawer();
    toast('A good choice', `${productById(id).name} added to your basket.`);
  }

  function setCategory(category) {
    state.category = category;
    state.wishlistOnly = false;
    state.dealsOnly = false;
    $$('.nav-category').forEach((button) => button.classList.toggle('active', button.dataset.category.toLowerCase() === category.toLowerCase() || (category === 'All' && button.dataset.category === 'All')));
    renderCategories();
    renderProducts();
    $('#deals-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function toast(title, detail = '') {
    const toastElement = document.createElement('div');
    toastElement.className = 'toast';
    toastElement.innerHTML = `<i data-lucide="circle-check"></i><span><strong>${title}</strong>${detail ? `<small>${detail}</small>` : ''}</span>`;
    $('#toast-region').append(toastElement);
    refreshIcons();
    window.setTimeout(() => toastElement.remove(), 3000);
  }

  function closePanels() {
    $('#cart-drawer').classList.remove('open');
    $('#cart-drawer').setAttribute('aria-hidden', 'true');
    $$('.modal').forEach((modal) => {
      modal.classList.remove('open');
      window.setTimeout(() => { modal.hidden = true; }, 180);
    });
    $('#overlay').classList.remove('visible');
    window.setTimeout(() => { $('#overlay').hidden = true; }, 180);
    document.body.classList.remove('locked');
  }

  function openModal(id) {
    $('#cart-drawer').classList.remove('open');
    $$('.modal').forEach((modal) => { modal.classList.remove('open'); modal.hidden = true; });
    const modal = document.getElementById(id);
    modal.hidden = false;
    $('#overlay').hidden = false;
    document.body.classList.add('locked');
    requestAnimationFrame(() => {
      $('#overlay').classList.add('visible');
      modal.classList.add('open');
    });
    refreshIcons();
  }

  function openCart() {
    $$('.modal').forEach((modal) => { modal.classList.remove('open'); modal.hidden = true; });
    renderDrawer();
    $('#cart-drawer').setAttribute('aria-hidden', 'false');
    $('#overlay').hidden = false;
    document.body.classList.add('locked');
    requestAnimationFrame(() => {
      $('#overlay').classList.add('visible');
      $('#cart-drawer').classList.add('open');
    });
  }

  function enableDeals() {
    state.dealsOnly = !state.dealsOnly;
    state.wishlistOnly = false;
    state.category = 'All';
    renderCategories();
    renderProducts();
    $('#deals-section').scrollIntoView({ behavior: 'smooth' });
  }

  function updateSearchSuggestions() {
    const suggestions = $('#search-suggestions');
    const query = $('#search-input').value.trim().toLowerCase();
    if (!query) {
      suggestions.hidden = true;
      return;
    }
    const matches = state.products.filter((product) => `${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(query)).slice(0, 4);
    const matchingCategory = categories.find((category) => category.name.toLowerCase().includes(query));
    suggestions.innerHTML = `${matches.length ? '<div class="suggestion-heading">GOOD THINGS TO EAT</div>' : ''}${matches.map((product) => `<button class="suggestion-row" type="button" data-suggestion-product="${product.id}"><img src="${product.image_url}" alt="" /><span><strong>${product.name}</strong><small>${product.category} · ${money(product.price)}</small></span></button>`).join('')}${matchingCategory ? `<div class="suggestion-heading">DEPARTMENTS</div><button class="suggestion-row" type="button" data-suggestion-category="${matchingCategory.name}"><span class="category-arrow"><i data-lucide="arrow-up-right"></i></span><span><strong>${matchingCategory.name}</strong><small>Shop the department</small></span></button>` : ''}${!matches.length && !matchingCategory ? '<div class="suggestion-heading">Try fruit, milk, eggs or pantry</div>' : ''}`;
    suggestions.hidden = false;
    refreshIcons();
  }

  $('#category-grid').addEventListener('click', (event) => {
    const card = event.target.closest('[data-category-card]');
    if (card) setCategory(card.dataset.categoryCard);
  });

  $('#product-grid').addEventListener('click', (event) => {
    const favorite = event.target.closest('[data-favorite]');
    if (favorite) {
      const id = String(favorite.dataset.favorite);
      state.wishlist = state.wishlist.includes(id) ? state.wishlist.filter((item) => item !== id) : [...state.wishlist, id];
      persist();
      renderProducts();
      toast(state.wishlist.includes(id) ? 'Saved for later' : 'Removed from wishlist');
      return;
    }
    const quantityButton = event.target.closest('[data-quantity]');
    if (quantityButton) {
      const id = quantityButton.dataset.id;
      state.selected[id] = Math.max(1, (state.selected[id] || 1) + (quantityButton.dataset.quantity === 'plus' ? 1 : -1));
      renderProducts();
      return;
    }
    const addButton = event.target.closest('[data-add]');
    if (addButton) addToCart(addButton.dataset.add, state.selected[addButton.dataset.add] || 1);
  });

  $('#filter-categories').addEventListener('change', (event) => {
    if (event.target.name === 'category-filter') setCategory(event.target.value);
  });
  $('#sort-select').addEventListener('change', renderProducts);
  $('#in-stock-filter').addEventListener('change', (event) => { state.stockOnly = event.target.checked; renderProducts(); });
  $('#deal-filter').addEventListener('change', (event) => { state.dealsOnly = event.target.checked; renderCategories(); renderProducts(); });
  $('#clear-filters').addEventListener('click', clearFilters);
  $('#empty-clear').addEventListener('click', clearFilters);
  function clearFilters() {
    state.category = 'All';
    state.query = '';
    state.dealsOnly = false;
    state.stockOnly = false;
    state.wishlistOnly = false;
    $('#search-input').value = '';
    $('#deal-filter').checked = false;
    $('#in-stock-filter').checked = false;
    $('#sort-select').value = 'featured';
    $$('.nav-category').forEach((button) => button.classList.toggle('active', button.dataset.category === 'All'));
    renderCategories();
    renderProducts();
  }

  $('#search-form').addEventListener('submit', (event) => {
    event.preventDefault();
    state.query = $('#search-input').value.trim();
    state.category = 'All';
    state.wishlistOnly = false;
    $('#search-suggestions').hidden = true;
    renderCategories();
    renderProducts();
    $('#deals-section').scrollIntoView({ behavior: 'smooth' });
  });
  $('#search-input').addEventListener('input', (event) => {
    state.query = event.target.value.trim();
    state.category = 'All';
    state.wishlistOnly = false;
    renderCategories();
    renderProducts();
    updateSearchSuggestions();
  });
  $('#search-input').addEventListener('focus', updateSearchSuggestions);
  $('#search-suggestions').addEventListener('click', (event) => {
    const product = event.target.closest('[data-suggestion-product]');
    const category = event.target.closest('[data-suggestion-category]');
    if (product) {
      const item = productById(product.dataset.suggestionProduct);
      $('#search-input').value = item.name;
      state.query = item.name;
      $('#search-suggestions').hidden = true;
      renderProducts();
      $('#deals-section').scrollIntoView({ behavior: 'smooth' });
    } else if (category) {
      $('#search-suggestions').hidden = true;
      $('#search-input').value = '';
      setCategory(category.dataset.suggestionCategory);
    }
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.search-form')) $('#search-suggestions').hidden = true;
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      event.preventDefault();
      $('#search-input').focus();
    }
    if (event.key === 'Escape') closePanels();
  });

  $$('.nav-category').forEach((button) => button.addEventListener('click', () => setCategory(button.dataset.category)));
  $('#shop-now').addEventListener('click', () => $('#categories-section').scrollIntoView({ behavior: 'smooth' }));
  $('#hero-deals').addEventListener('click', enableDeals);
  $('#deals-shortcut').addEventListener('click', enableDeals);
  $('#all-categories').addEventListener('click', () => { state.category = 'All'; renderCategories(); renderProducts(); $('#deals-section').scrollIntoView({ behavior: 'smooth' }); });
  $('#load-more').addEventListener('click', () => { clearFilters(); toast('You’re all caught up', 'Showing the full FreshMart sample catalogue.'); });
  $('#wishlist-button').addEventListener('click', () => {
    state.wishlistOnly = !state.wishlistOnly;
    state.category = 'All';
    state.dealsOnly = false;
    renderCategories();
    renderProducts();
    $('#active-filter-label').textContent = state.wishlistOnly ? 'Your wishlist' : 'Everything fresh, all in one place';
    $('#deals-section').scrollIntoView({ behavior: 'smooth' });
  });
  $('#account-button').addEventListener('click', () => toast('Your account is coming together', 'Sign-in and order history are the next build step.'));
  $('#cart-button').addEventListener('click', openCart);
  $('#sticky-cart-button').addEventListener('click', openCart);
  $('#overlay').addEventListener('click', closePanels);
  $$('[data-close]').forEach((button) => button.addEventListener('click', closePanels));
  $('#checkout-button').addEventListener('click', () => {
    if (!countItems()) return;
    $('#checkout-address').value = state.location;
    openModal('checkout-modal');
  });

  $('#drawer-items').addEventListener('click', (event) => {
    const button = event.target.closest('[data-cart-quantity]');
    if (!button) return;
    const id = button.dataset.id;
    state.cart[id] = (state.cart[id] || 0) + (button.dataset.cartQuantity === 'plus' ? 1 : -1);
    if (state.cart[id] <= 0) delete state.cart[id];
    persist();
    renderDrawer();
  });
  $('#reorder-items').addEventListener('click', (event) => {
    const button = event.target.closest('[data-reorder-add]');
    if (button) addToCart(button.dataset.reorderAdd);
  });
  $('#reorder-all').addEventListener('click', () => {
    ['milk', 'eggs', 'rice'].map(productById).filter(Boolean).forEach((product) => { state.cart[product.id] = (state.cart[product.id] || 0) + 1; });
    persist();
    renderDrawer();
    toast('Your usuals are in', 'Milk, eggs and rice added to your basket.');
  });

  $('#location-button').addEventListener('click', () => openModal('location-modal'));
  $('#mobile-location-button').addEventListener('click', () => openModal('location-modal'));
  $$('.saved-location').forEach((button) => button.addEventListener('click', () => {
    $$('.saved-location').forEach((item) => item.classList.remove('chosen'));
    button.classList.add('chosen');
    $('#location-input').value = button.dataset.location;
  }));
  $('#use-location').addEventListener('click', () => {
    if (!navigator.geolocation) return toast('Location unavailable', 'Enter your area or postcode instead.');
    navigator.geolocation.getCurrentPosition(() => toast('Location found', 'For now, choose a saved Dhaka delivery area.'), () => toast('Location unavailable', 'Enter your area or postcode instead.'), { timeout: 5000 });
  });
  $('#location-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const location = $('#location-input').value.trim();
    if (!location) return;
    state.location = location;
    localStorage.setItem('freshmart-location', location);
    $('#location-label').textContent = location;
    $('#mobile-location-label').textContent = location;
    closePanels();
    toast('Delivery spot updated', `We’ll bring the good things to ${location}.`);
  });

  $('#checkout-form').addEventListener('submit', (event) => {
    event.preventDefault();
    if (!countItems()) return;
    const form = new FormData(event.currentTarget);
    const orderId = `FM-${Math.floor(100000 + Math.random() * 899999)}`;
    const slot = `${form.get('day')} · ${form.get('slot')}`;
    $('#order-number').textContent = `#${orderId}`;
    $('#success-slot').textContent = slot;
    $('#success-address').textContent = form.get('address');
    localStorage.setItem('freshmart-last-order', JSON.stringify({ orderId, items: state.cart, placedAt: new Date().toISOString() }));
    state.cart = {};
    persist();
    renderDrawer();
    openModal('success-modal');
  });
  $('#success-done').addEventListener('click', () => { closePanels(); toast('See you again soon', 'Thanks for shopping with FreshMart.'); });
  $('#track-order').addEventListener('click', () => { closePanels(); toast('Order placed', 'Live order tracking will be connected with the delivery API.'); });

  $('#newsletter-form').addEventListener('submit', (event) => {
    event.preventDefault();
    event.currentTarget.reset();
    toast('You’re on the list', 'A little note from your local grocer, now and then.');
  });
  $$('.footer-column a[data-footer-link]').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); toast('We’re here to help', 'Customer support will be connected in the next build step.'); }));
  $$('.bottom-nav-item').forEach((button) => button.addEventListener('click', () => {
    const target = button.dataset.bottom;
    $$('.bottom-nav-item').forEach((item) => item.classList.toggle('selected', item === button));
    if (target === 'home') window.scrollTo({ top: 0, behavior: 'smooth' });
    if (target === 'categories') $('#categories-section').scrollIntoView({ behavior: 'smooth' });
    if (target === 'search') {
      const search = $('#search-form');
      search.classList.add('is-open');
      $('#search-input').focus();
    }
    if (target === 'cart') openCart();
    if (target === 'account') toast('Your account is coming together', 'Sign-in and order history are the next build step.');
  }));
  $('#menu-button').addEventListener('click', () => {
    $('#category-grid').scrollIntoView({ behavior: 'smooth' });
    toast('Take a look around', 'Choose a department to browse what’s fresh.');
  });

  async function start() {
    state.products = await window.FreshMartAPI.getProducts({ limit: 60 });
    if (!Array.isArray(state.products)) state.products = window.FreshMartAPI.sampleProducts;
    renderCategories();
    renderProducts();
    renderReorder();
    renderDrawer();
    updateCartSummary();
    $('#location-label').textContent = state.location;
    $('#mobile-location-label').textContent = state.location;
    refreshIcons();
  }

  start();
})();
