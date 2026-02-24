// public/app.js — frontend logic for the product catalog UI
(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  let currentPage = 1;
  const PAGE_SIZE = 20;

  // ---------- Bootstrap: load filter dropdowns ----------
  async function loadFilters() {
    try {
      const [cats, brands] = await Promise.all([
        fetch('/api/categories').then((r) => r.json()),
        fetch('/api/brands').then((r) => r.json()),
      ]);
      const catSel = $('#categoryFilter');
      cats.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c; opt.textContent = c;
        catSel.appendChild(opt);
      });
      const brandSel = $('#brandFilter');
      brands.forEach((b) => {
        const opt = document.createElement('option');
        opt.value = b; opt.textContent = b;
        brandSel.appendChild(opt);
      });
    } catch (err) {
      console.error('Failed to load filters', err);
    }
  }

  // ---------- Fetch & render products ----------
  async function fetchProducts(page) {
    currentPage = page || 1;
    const q = $('#searchQuery').value.trim();
    const category = $('#categoryFilter').value;
    const brand = $('#brandFilter').value;
    const minPrice = $('#minPrice').value;
    const maxPrice = $('#maxPrice').value;
    const sort = $('#sortField').value;
    const order = $('#sortOrder').value;

    const isSearch = q || category || brand || minPrice || maxPrice;

    let url;
    if (isSearch) {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (category) params.set('category', category);
      if (brand) params.set('brand', brand);
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);
      params.set('page', currentPage);
      params.set('limit', PAGE_SIZE);
      url = `/api/products/search?${params}`;
    } else {
      url = `/api/products?page=${currentPage}&limit=${PAGE_SIZE}&sort=${sort}&order=${order}`;
    }

    const grid = $('#productGrid');
    grid.innerHTML = '<div class="loading">Searching…</div>';

    const t0 = performance.now();
    try {
      const res = await fetch(url);
      const data = await res.json();
      const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
      showTiming(elapsed, data.total);
      renderProducts(data.products);
      renderPagination(data.page, data.totalPages, data.total);
    } catch (err) {
      grid.innerHTML = `<div class="loading" style="color:#c0392b">Error loading products: ${err.message}</div>`;
    }
  }

  function showTiming(seconds, total) {
    const el = $('#timing');
    const cls = parseFloat(seconds) > 1 ? 'slow' : 'fast';
    el.innerHTML = `Query returned <strong>${total.toLocaleString()}</strong> results in <span class="${cls}">${seconds}s</span>`;
  }

  function renderProducts(products) {
    const grid = $('#productGrid');
    if (products.length === 0) {
      grid.innerHTML = '<div class="loading">No products found.</div>';
      return;
    }
    grid.innerHTML = products.map((p) => `
      <div class="product-card">
        <div class="name">${esc(p.name)}</div>
        <div class="sku">${esc(p.sku)}</div>
        <div class="meta">
          <span>${esc(p.category)}</span>
          <span>${esc(p.brand)}</span>
        </div>
        <div class="price">$${Number(p.price).toFixed(2)}</div>
        <div class="meta">
          <span class="rating">${stars(p.rating)} ${p.rating}</span>
          <span class="stock">${p.stock_qty > 0 ? p.stock_qty + ' in stock' : 'Out of stock'}</span>
        </div>
      </div>
    `).join('');
  }

  function renderPagination(page, totalPages, total) {
    const el = $('#pagination');
    if (totalPages <= 1) { el.innerHTML = ''; return; }
    const prevDisabled = page <= 1 ? 'disabled' : '';
    const nextDisabled = page >= totalPages ? 'disabled' : '';
    el.innerHTML = `
      <button ${prevDisabled} onclick="window.__goPage(1)">«</button>
      <button ${prevDisabled} onclick="window.__goPage(${page - 1})">‹</button>
      <span>Page ${page} of ${totalPages.toLocaleString()} (${total.toLocaleString()} items)</span>
      <button ${nextDisabled} onclick="window.__goPage(${page + 1})">›</button>
      <button ${nextDisabled} onclick="window.__goPage(${totalPages})">»</button>
    `;
  }

  window.__goPage = function (p) { fetchProducts(p); };

  function stars(rating) {
    const full = Math.round(rating);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  }

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ---------- Event listeners ----------
  $('#searchBtn').addEventListener('click', () => fetchProducts(1));
  $('#resetBtn').addEventListener('click', () => {
    $('#searchQuery').value = '';
    $('#categoryFilter').value = '';
    $('#brandFilter').value = '';
    $('#minPrice').value = '';
    $('#maxPrice').value = '';
    $('#sortField').value = 'price';
    $('#sortOrder').value = 'asc';
    fetchProducts(1);
  });
  $('#searchQuery').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') fetchProducts(1);
  });

  // ---------- Init ----------
  loadFilters();
  fetchProducts(1);
})();
