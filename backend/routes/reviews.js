const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../auth');

// GET /product/:productId - get reviews for a product
router.get('/product/:productId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, u.first_name, u.last_name
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.productId]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error listing reviews:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve reviews' });
  }
});

// POST / - create review (authenticated users only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { product_id, rating, comment } = req.body;
    const user_id = req.user.id;

    if (!product_id || !rating) {
      return res.status(400).json({ success: false, message: 'product_id and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    const id = require('crypto').randomBytes(16).toString('hex');
    const now = new Date().toISOString();

    const { rows } = await pool.query(
      `INSERT INTO reviews (id, product_id, user_id, rating, comment, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, product_id, user_id, rating, comment || null, now]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Error creating review:', err);
    res.status(500).json({ success: false, message: 'Failed to create review' });
  }
});

module.exports = router;
