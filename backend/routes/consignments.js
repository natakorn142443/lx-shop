// ===================================
// routes/consignments.js - API สำหรับควบคุมสินค้าฝากขาย C2C
// ===================================
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware, adminMiddleware } = require('../auth');

// POST /api/consignments - ลูกค้าส่งข้อมูลฝากขายสินค้า (ต้องล็อกอิน)
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { product_name, category_id, price, description, image_url, contact_info } = req.body;
        const userId = req.user.id;

        if (!product_name || !price || !contact_info) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' });
        }

        const result = await pool.query(
            `INSERT INTO consignments (user_id, product_name, category_id, price, description, image_url, contact_info, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending') RETURNING *`,
            [userId, product_name, category_id || null, price, description || '', image_url || null, contact_info]
        );

        res.status(201).json({ success: true, data: result.rows[0], message: 'ส่งข้อมูลฝากขายสำเร็จแล้ว รอแอดมินอนุมัติ' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/consignments - ดึงข้อมูลสินค้าฝากขายที่ได้รับการอนุมัติ (แสดงผลหน้าร้าน C2C)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT c.*, u.first_name, u.last_name, cat.name as category_name
            FROM consignments c
            LEFT JOIN users u ON c.user_id = u.id
            LEFT JOIN categories cat ON c.category_id = cat.id
            WHERE c.status = 'approved'
            ORDER BY c.created_at DESC
        `);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/consignments/my - ดึงรายการฝากขายของตัวฉันเอง
router.get('/my', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await pool.query(`
            SELECT c.*, cat.name as category_name
            FROM consignments c
            LEFT JOIN categories cat ON c.category_id = cat.id
            WHERE c.user_id = $1
            ORDER BY c.created_at DESC
        `, [userId]);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/consignments/admin/all - ดึงรายการฝากขายทั้งหมดเพื่ออนุมัติ (สำหรับ Admin เท่านั้น)
router.get('/admin/all', adminMiddleware, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT c.*, u.first_name, u.last_name, u.email, cat.name as category_name
            FROM consignments c
            LEFT JOIN users u ON c.user_id = u.id
            LEFT JOIN categories cat ON c.category_id = cat.id
            ORDER BY 
                CASE WHEN c.status = 'pending' THEN 0 ELSE 1 END,
                c.created_at DESC
        `);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/consignments/admin/:id/status - อนุมัติหรือปฏิเสธคำขอฝากขาย (สำหรับ Admin เท่านั้น)
router.put('/admin/:id/status', adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // approved, rejected, sold

        if (!['approved', 'rejected', 'sold', 'pending'].includes(status)) {
            return res.status(400).json({ success: false, message: 'สถานะไม่ถูกต้อง' });
        }

        const result = await pool.query(
            'UPDATE consignments SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบรายการฝากขายนี้' });
        }

        res.json({ success: true, data: result.rows[0], message: `อัปเดตสถานะเป็น ${status} สำเร็จ` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
