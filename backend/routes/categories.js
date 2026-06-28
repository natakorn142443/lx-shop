const express = require('express');
const router = express.Router();
const pool = require('../db');
const { adminMiddleware } = require('../auth');

// GET / - list all categories
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM categories ORDER BY name ASC'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error listing categories:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve categories' });
  }
});

// POST / - create category (admin only)
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const now = new Date().toISOString();

    const { rows } = await pool.query(
      `INSERT INTO categories (name, description, created_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, description || null, now]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ success: false, message: 'Category name already exists' });
    }
    console.error('Error creating category:', err);
    res.status(500).json({ success: false, message: 'Failed to create category' });
  }
});

// PUT /:id - update category (admin only)
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;

    const { rows, rowCount } = await pool.query(
      `UPDATE categories SET name = $1, description = $2
       WHERE id = $3
       RETURNING *`,
      [name, description, req.params.id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ success: false, message: 'Category name already exists' });
    }
    console.error('Error updating category:', err);
    res.status(500).json({ success: false, message: 'Failed to update category' });
  }
});

// DELETE /:id - delete category (admin only)
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM categories WHERE id = $1',
      [req.params.id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ success: false, message: 'Failed to delete category' });
  }
});

module.exports = router;
