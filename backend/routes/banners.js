const express = require('express');
const router = express.Router();
const pool = require('../db');
const { adminMiddleware } = require('../auth');

// GET / - list all active banners ordered by sort_order
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM banners WHERE is_active = TRUE ORDER BY sort_order ASC'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error listing banners:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve banners' });
  }
});

// GET /all - list ALL banners including inactive (admin only)
router.get('/all', adminMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM banners ORDER BY sort_order ASC'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error listing all banners:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve banners' });
  }
});

// POST / - create banner (admin only)
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { image_url, link_url, is_active, sort_order } = req.body;

    if (!image_url) {
      return res.status(400).json({ success: false, message: 'image_url is required' });
    }

    const now = new Date().toISOString();

    const { rows } = await pool.query(
      `INSERT INTO banners (image_url, link_url, is_active, sort_order, created_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [image_url, link_url || null, is_active !== undefined ? (is_active === true || is_active === 1 || is_active === '1' || is_active === 'true') : true, sort_order || 0, now]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Error creating banner:', err);
    res.status(500).json({ success: false, message: 'Failed to create banner' });
  }
});

// PUT /:id - update banner (admin only)
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const { image_url, link_url, is_active, sort_order } = req.body;

    const { rows, rowCount } = await pool.query(
      `UPDATE banners SET image_url = $1, link_url = $2, is_active = $3, sort_order = $4
       WHERE id = $5
       RETURNING *`,
      [image_url, link_url, is_active !== undefined ? (is_active === true || is_active === 1 || is_active === '1' || is_active === 'true') : true, sort_order, req.params.id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Error updating banner:', err);
    res.status(500).json({ success: false, message: 'Failed to update banner' });
  }
});

// DELETE /:id - delete banner (admin only)
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM banners WHERE id = $1',
      [req.params.id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    res.json({ success: true, message: 'Banner deleted successfully' });
  } catch (err) {
    console.error('Error deleting banner:', err);
    res.status(500).json({ success: false, message: 'Failed to delete banner' });
  }
});

module.exports = router;
