// src/server.js — Express app serving API + static frontend
require('dotenv').config();
const express = require('express');
const path = require('path');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- static assets ----------
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---------- API: list / paginate products ----------
// GET /api/products?page=1&limit=20&sort=price&order=asc
app.get('/api/products', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = (page - 1) * limit;

    const allowedSort = ['id', 'name', 'price', 'category', 'brand', 'rating', 'created_at'];
    const sort = allowedSort.includes(req.query.sort) ? req.query.sort : 'id';
    const order = req.query.order === 'desc' ? 'DESC' : 'ASC';

    const [rows] = await pool.query(
      `SELECT id, sku, name, category, brand, price, stock_qty, rating
       FROM products
       ORDER BY ${sort} ${order}
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM products');

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      products: rows,
    });
  } catch (err) {
    console.error('GET /api/products error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------- API: search products ----------
// GET /api/products/search?q=widget&category=Electronics&minPrice=10&maxPrice=100&page=1&limit=20
//
// FIX (trace 4B7A45AA77C6A78D5C820AC03D97382D):
//   pool.query() does not enforce prepared-statement binding in all mysql2
//   configurations — a placeholder/parameter count mismatch silently produced
//   unresolved `?` tokens that MySQL rejected with a syntax error.
//   Using pool.execute() forces the prepared-statement protocol so mysql2 will
//   throw *before* sending a malformed query to the database.
app.get('/api/products/search', async (req, res) => {
  try {
    const { category, brand, minPrice, maxPrice } = req.query;
    // Trim q and treat blank strings as absent — prevents pushing two LIKE
    // placeholders without corresponding parameter values.
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = (page - 1) * limit;

    const where = [];
    const params = [];

    if (q) {
      where.push('(name LIKE ? OR description LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }
    if (category) {
      where.push('category = ?');
      params.push(category);
    }
    if (brand) {
      where.push('brand = ?');
      params.push(brand);
    }
    if (minPrice) {
      where.push('price >= ?');
      params.push(parseFloat(minPrice));
    }
    if (maxPrice) {
      where.push('price <= ?');
      params.push(parseFloat(maxPrice));
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    // Defensive assertion: catch placeholder/parameter mismatches in development
    // before they reach MySQL as a syntax error.
    const placeholderCount = (whereClause.match(/\?/g) || []).length;
    if (placeholderCount !== params.length) {
      throw new Error(
        `Parameter count mismatch: SQL has ${placeholderCount} placeholder(s) but params has ${params.length} value(s). whereClause="${whereClause}"`
      );
    }

    // Use pool.execute() (prepared statements) instead of pool.query() so that
    // mysql2 validates and substitutes every `?` via the binary protocol — MySQL
    // never sees a raw `?` token regardless of server version or sql_mode.
    const countSQL = `SELECT COUNT(*) AS total FROM products ${whereClause}`;
    const [[{ total }]] = await pool.execute(countSQL, params);

    const dataSQL = `SELECT id, sku, name, category, brand, price, stock_qty, rating
                     FROM products ${whereClause}
                     ORDER BY price ASC
                     LIMIT ? OFFSET ?`;
    const [rows] = await pool.execute(dataSQL, [...params, limit, offset]);

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      products: rows,
    });
  } catch (err) {
    console.error('GET /api/products/search error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------- API: single product ----------
app.get('/api/products/:id', async (req, res) => {
  try {
    const [[product]] = await pool.query(
      'SELECT * FROM products WHERE id = ?',
      [req.params.id]
    );
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    console.error('GET /api/products/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------- API: categories list ----------
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT DISTINCT category FROM products ORDER BY category'
    );
    res.json(rows.map((r) => r.category));
  } catch (err) {
    console.error('GET /api/categories error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------- API: brands list ----------
app.get('/api/brands', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT DISTINCT brand FROM products ORDER BY brand'
    );
    res.json(rows.map((r) => r.brand));
  } catch (err) {
    console.error('GET /api/brands error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------- Health ----------
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`Product Catalog running → http://localhost:${PORT}`);
});

module.exports = app;
