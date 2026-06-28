const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /user/:userId - get user's wishlist with product details
router.get('/user/:userId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT w.*, p.name AS product_name, p.price, p.discount_price,
              p.image_url, p.stock_quantity, p.is_active
       FROM wishlists w
       LEFT JOIN products p ON w.product_id = p.id
       WHERE w.user_id = $1
       ORDER BY w.created_at DESC`,
      [req.params.userId]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error listing wishlist:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve wishlist' });
  }
});

// POST / - add item to wishlist
router.post('/', async (req, res) => {
  try {
    const { user_id, product_id } = req.body;

    if (!user_id || !product_id) {
      return res.status(400).json({ success: false, message: 'user_id and product_id are required' });
    }

    const id = require('crypto').randomBytes(16).toString('hex');
    const now = new Date().toISOString();

    const { rows } = await pool.query(
      `INSERT INTO wishlists (id, user_id, product_id, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, user_id, product_id, now]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ success: false, message: 'Product already in wishlist' });
    }
    console.error('Error adding to wishlist:', err);
    res.status(500).json({ success: false, message: 'Failed to add to wishlist' });
  }
});

// DELETE /:id - remove item from wishlist
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM wishlists WHERE id = $1',
      [req.params.id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Wishlist item not found' });
    }

    res.json({ success: true, message: 'Removed from wishlist successfully' });
  } catch (err) {
    console.error('Error removing from wishlist:', err);
    res.status(500).json({ success: false, message: 'Failed to remove from wishlist' });
  }
});

module.exports = router;
