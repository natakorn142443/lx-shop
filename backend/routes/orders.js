// ===================================
// routes/orders.js - ระบบจัดการคำสั่งซื้อ (สร้าง, อัปเดตสถานะ, PromptPay QR, นำเข้าสต๊อก)
// ===================================
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../db');
const { adminMiddleware } = require('../auth');
const { sendDiscordNotification } = require('../discordNotify');
const { extractSlipQr } = require('../slipVerifier');

// ===================================
// POST / - สร้างคำสั่งซื้อใหม่ (Transaction)
// ===================================
router.post('/', async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const { user_id, shipping_address, items, promo_code, payment_method, points_used, payment_slip_url } = req.body;

        if (!user_id || !shipping_address || !items || items.length === 0) {
            await client.query('ROLLBACK');
            client.release();
            return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
        }

        // 1) คำนวณยอดรวม
        let subtotal = 0;
        for (const item of items) {
            subtotal += item.unit_price * item.quantity;
        }

        // 2) ตรวจสอบและคำนวณส่วนลดโปรโมชั่น
        let discountApplied = 0;
        if (promo_code) {
            const promoResult = await client.query(
                'SELECT * FROM promo_codes WHERE code = $1 AND is_active = 1',
                [promo_code]
            );

            if (promoResult.rows.length > 0) {
                const promo = promoResult.rows[0];
                if (promo.discount_type === 'percent') {
                    discountApplied = subtotal * (promo.discount_amount / 100);
                } else {
                    discountApplied = promo.discount_amount;
                }
            }
        }

        // 3) หักคะแนนที่ใช้ (ถ้ามี)
        let actualPointsUsed = 0;
        if (points_used && points_used > 0) {
            const userResult = await client.query('SELECT points FROM users WHERE id = $1', [user_id]);
            if (userResult.rows.length > 0 && userResult.rows[0].points >= points_used) {
                actualPointsUsed = points_used;
            }
        }

        // คำนวณยอดสุทธิ
        const totalAmount = Math.max(0, subtotal - discountApplied - actualPointsUsed);

        // 4) คำนวณคะแนนที่ได้รับ (100 บาท = 1 คะแนน)
        const pointsEarned = Math.floor(totalAmount / 100);

        // 5) ตรวจสอบสลิปการโอนเงิน (ถ้ามี)
        let paymentSlipQr = null;
        let orderStatus = 'pending';
        let paymentStatus = 'pending';

        if (payment_slip_url) {
            try {
                const qrData = await extractSlipQr(payment_slip_url);
                if (qrData) {
                    // ตรวจสอบ QR ซ้ำ
                    const duplicateCheck = await client.query(
                        'SELECT id FROM orders WHERE payment_slip_qr = $1',
                        [qrData]
                    );

                    if (duplicateCheck.rows.length > 0) {
                        await client.query('ROLLBACK');
                        client.release();
                        return res.status(400).json({
                            success: false,
                            message: 'สลิปนี้ถูกใช้ไปแล้ว กรุณาอัปโหลดสลิปใหม่'
                        });
                    }

                    paymentSlipQr = qrData;
                    orderStatus = 'paid';
                    paymentStatus = 'paid';
                }
            } catch (slipErr) {
                console.error('Slip verification error:', slipErr.message);
            }
        }

        // 6) สร้าง Order
        const orderId = crypto.randomBytes(16).toString('hex').toUpperCase();

        await client.query(
            `INSERT INTO orders (id, user_id, total_amount, discount_applied, promo_code, payment_method, payment_slip_url, payment_slip_qr, payment_status, points_earned, points_used, status, shipping_address)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [orderId, user_id, totalAmount, discountApplied, promo_code || null, payment_method || null, payment_slip_url || null, paymentSlipQr, paymentStatus, pointsEarned, actualPointsUsed, orderStatus, shipping_address]
        );

        // 7) Loop items: ตรวจสต๊อก, เพิ่ม order_items, ลดสต๊อก
        const io = req.app.get('io');
        for (const item of items) {
            // ตรวจสอบสต๊อก
            const stockResult = await client.query(
                'SELECT stock_quantity, name FROM products WHERE id = $1',
                [item.product_id]
            );

            if (stockResult.rows.length === 0) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(400).json({
                    success: false,
                    message: `ไม่พบสินค้า ID: ${item.product_id}`
                });
            }

            const product = stockResult.rows[0];
            if (product.stock_quantity < item.quantity) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(400).json({
                    success: false,
                    message: `สินค้า "${product.name}" สต๊อกไม่เพียงพอ (คงเหลือ ${product.stock_quantity} ชิ้น)`
                });
            }

            // เพิ่ม order_items
            const itemId = crypto.randomBytes(16).toString('hex').toUpperCase();
            await client.query(
                'INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4, $5)',
                [itemId, orderId, item.product_id, item.quantity, item.unit_price]
            );

            // ลดสต๊อก
            await client.query(
                'UPDATE products SET stock_quantity = stock_quantity - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [item.quantity, item.product_id]
            );

            // ตรวจสอบสต๊อกต่ำ (<=5)
            const newStock = product.stock_quantity - item.quantity;
            if (newStock <= 5) {
                sendDiscordNotification(`⚠️ **สต๊อกต่ำ!** สินค้า "${product.name}" เหลือเพียง ${newStock} ชิ้น`);
                if (io) {
                    io.emit('low_stock_alert', {
                        product_id: item.product_id,
                        product_name: product.name,
                        remaining: newStock
                    });
                }
            }
        }

        // 8) อัปเดตคะแนนผู้ใช้ (เพิ่มที่ได้ - หักที่ใช้)
        const netPoints = pointsEarned - actualPointsUsed;
        await client.query(
            'UPDATE users SET points = points + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [netPoints, user_id]
        );

        // 9) COMMIT
        await client.query('COMMIT');
        client.release();

        // 10) แจ้งเตือน Discord ออเดอร์ใหม่
        sendDiscordNotification(
            `🛒 **ออเดอร์ใหม่!** #${orderId.substring(0, 8)}\n💰 ยอดรวม: ${totalAmount.toFixed(2)} บาท\n📦 สินค้า ${items.length} รายการ\n💳 ชำระด้วย: ${payment_method || 'ไม่ระบุ'}`
        );

        res.status(201).json({
            success: true,
            message: 'สร้างคำสั่งซื้อสำเร็จ!',
            data: {
                order_id: orderId,
                total_amount: totalAmount,
                discount_applied: discountApplied,
                points_earned: pointsEarned,
                points_used: actualPointsUsed,
                status: orderStatus,
                payment_status: paymentStatus
            }
        });
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch (rbErr) { /* ignore */ }
        client.release();
        console.error('Create order error:', err.message);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ' });
    }
});

// ===================================
// GET /all - ดึงคำสั่งซื้อทั้งหมด (Admin Only)
// ===================================
router.get('/all', adminMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT o.*, u.first_name, u.last_name, u.email
             FROM orders o
             LEFT JOIN users u ON o.user_id = u.id
             ORDER BY o.created_at DESC`
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Get all orders error:', err.message);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลคำสั่งซื้อ' });
    }
});

// ===================================
// GET /user/:userId - ดึงคำสั่งซื้อของผู้ใช้
// ===================================
router.get('/user/:userId', async (req, res) => {
    try {
        const ordersResult = await pool.query(
            'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
            [req.params.userId]
        );

        // ดึง order_items พร้อมข้อมูลสินค้าสำหรับแต่ละ order
        const orders = [];
        for (const order of ordersResult.rows) {
            const itemsResult = await pool.query(
                `SELECT oi.*, p.name AS product_name, p.image_url
                 FROM order_items oi
                 LEFT JOIN products p ON oi.product_id = p.id
                 WHERE oi.order_id = $1`,
                [order.id]
            );
            orders.push({ ...order, items: itemsResult.rows });
        }

        res.json({ success: true, data: orders });
    } catch (err) {
        console.error('Get user orders error:', err.message);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลคำสั่งซื้อ' });
    }
});

// ===================================
// PUT /status - อัปเดตสถานะคำสั่งซื้อ (Admin Only)
// ===================================
router.put('/status', adminMiddleware, async (req, res) => {
    try {
        const { order_id, status } = req.body;

        if (!order_id || !status) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุ order_id และ status' });
        }

        const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'สถานะไม่ถูกต้อง' });
        }

        const result = await pool.query(
            'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [status, order_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบคำสั่งซื้อ' });
        }

        res.json({ success: true, message: `อัปเดตสถานะเป็น "${status}" สำเร็จ`, data: result.rows[0] });
    } catch (err) {
        console.error('Update order status error:', err.message);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะ' });
    }
});

// ===================================
// POST /promptpay - สร้าง QR Code PromptPay
// ===================================
router.post('/promptpay', async (req, res) => {
    try {
        const { phone, amount } = req.body;

        if (!phone || !amount) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุเบอร์โทรศัพท์และจำนวนเงิน' });
        }

        const generatePayload = require('promptpay-qr');
        const QRCode = require('qrcode');

        const payload = generatePayload(phone, { amount: parseFloat(amount) });
        const qrDataUrl = await QRCode.toDataURL(payload);

        res.json({
            success: true,
            data: {
                qr: qrDataUrl,
                payload: payload,
                amount: parseFloat(amount)
            }
        });
    } catch (err) {
        console.error('PromptPay QR error:', err.message);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้าง QR Code' });
    }
});

// ===================================
// POST /validate-code - ตรวจสอบโค้ดส่วนลด
// ===================================
router.post('/validate-code', async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุโค้ดส่วนลด' });
        }

        const result = await pool.query(
            'SELECT * FROM promo_codes WHERE code = $1 AND is_active = 1',
            [code]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'โค้ดส่วนลดไม่ถูกต้องหรือหมดอายุ' });
        }

        const promo = result.rows[0];
        res.json({
            success: true,
            message: 'โค้ดส่วนลดใช้ได้!',
            data: {
                code: promo.code,
                discount_amount: promo.discount_amount,
                discount_type: promo.discount_type
            }
        });
    } catch (err) {
        console.error('Validate code error:', err.message);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบโค้ด' });
    }
});

// ===================================
// POST /import-stock - นำเข้าสต๊อกสินค้า (Admin Only)
// ===================================
router.post('/import-stock', adminMiddleware, async (req, res) => {
    try {
        const { product_id, quantity, cost_price } = req.body;

        if (!product_id || !quantity || !cost_price) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุข้อมูลให้ครบถ้วน' });
        }

        // บันทึกการนำเข้า
        const importId = crypto.randomBytes(16).toString('hex').toUpperCase();
        await pool.query(
            'INSERT INTO stock_imports (id, product_id, quantity, cost_price) VALUES ($1, $2, $3, $4)',
            [importId, product_id, quantity, cost_price]
        );

        // อัปเดตสต๊อกสินค้า
        await pool.query(
            'UPDATE products SET stock_quantity = stock_quantity + $1, cost_price = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            [quantity, cost_price, product_id]
        );

        res.json({
            success: true,
            message: `นำเข้าสต๊อก ${quantity} ชิ้นสำเร็จ`,
            data: { import_id: importId, product_id, quantity, cost_price }
        });
    } catch (err) {
        console.error('Import stock error:', err.message);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการนำเข้าสต๊อก' });
    }
});

module.exports = router;
