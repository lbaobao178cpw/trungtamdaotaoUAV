const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET /api/nghiep-vu-hang-b - list (optionally filter by category)
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let sql = 'SELECT * FROM nghiep_vu_hang_b WHERE is_active = 1';
    const params = [];
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    sql += ' ORDER BY sort_order DESC, id DESC';
    const [rows] = await pool.execute(sql, params);
    res.json(Array.isArray(rows) ? rows : []);
  } catch (err) {
    console.error('Error fetching nghiep_vu_hang_b:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET by id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute('SELECT * FROM nghiep_vu_hang_b WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// POST create (admin)
router.post('/', async (req, res) => {
  try {
    const { code, title, description, category, duration_minutes, price, is_active = 1, sort_order = 0 } = req.body;
    const sql = `INSERT INTO nghiep_vu_hang_b (code, title, description, category, duration_minutes, price, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const [result] = await pool.execute(sql, [code, title, description, category, duration_minutes, price, is_active ? 1 : 0, sort_order]);
    const [rows] = await pool.execute('SELECT * FROM nghiep_vu_hang_b WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating nghiep_vu_hang_b:', err);
    res.status(500).json({ message: err.message });
  }
});

// PUT update
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, title, description, category, duration_minutes, price, is_active, sort_order } = req.body;
    const sql = `UPDATE nghiep_vu_hang_b SET code = ?, title = ?, description = ?, category = ?, duration_minutes = ?, price = ?, is_active = ?, sort_order = ?, updated_at = NOW() WHERE id = ?`;
    const [result] = await pool.execute(sql, [code, title, description, category, duration_minutes, price, is_active ? 1 : 0, sort_order, id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Not found' });
    const [rows] = await pool.execute('SELECT * FROM nghiep_vu_hang_b WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.execute('DELETE FROM nghiep_vu_hang_b WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
