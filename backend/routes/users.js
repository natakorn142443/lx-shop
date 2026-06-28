// ===================================
// routes/users.js - ระบบจัดการผู้ใช้งาน (สมัคร, ล็อกอิน, จัดการคะแนน, รหัสผ่าน)
// ===================================
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../db');
const { signToken, authMiddleware, adminMiddleware } = require('../auth');

function hashPassword(pw) {
    return crypto.createHash('sha256').update(pw).digest('hex');
}

// ===================================
// POST /register - สมัครสมาชิกใหม่
// ===================================
router.post('/register', async (req, res) => {
    try {
        const { first_name, last_name, email, password, phone_number } = req.body;

        if (!first_name || !last_name || !email || !password) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
        }

        // ตรวจสอบอีเมลซ้ำ
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'อีเมลนี้ถูกใช้งานแล้ว' });
        }

        const id = crypto.randomBytes(16).toString('hex').toUpperCase();
        const password_hash = hashPassword(password);

        await pool.query(
            'INSERT INTO users (id, first_name, last_name, email, password_hash, phone_number) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, first_name, last_name, email, password_hash, phone_number || null]
        );

        const token = signToken({ id, email, role: 'customer', first_name, last_name });

        res.header('x-auth-token', token);
        res.status(201).json({
            success: true,
            message: 'สมัครสมาชิกสำเร็จ!',
            token,
            data: { id, first_name, last_name, email, role: 'customer' }
        });
    } catch (err) {
        console.error('Register error:', err.message);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสมัครสมาชิก' });
    }
});

// ===================================
// POST /login - เข้าสู่ระบบ
// ===================================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกอีเมลและรหัสผ่าน' });
        }

        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }

        const user = result.rows[0];
        const hashedInput = hashPassword(password);

        if (hashedInput !== user.password_hash) {
            return res.status(401).json({ success: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }

        const token = signToken({
            id: user.id,
            email: user.email,
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name
        });

        res.header('x-auth-token', token);
        res.json({
            success: true,
            message: 'เข้าสู่ระบบสำเร็จ!',
            token,
            data: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                role: user.role,
                phone_number: user.phone_number,
                points: user.points,
                created_at: user.created_at
            }
        });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
    }
});

// ===================================
// GET /all - ดึงรายชื่อผู้ใช้ทั้งหมด (Admin Only)
// ===================================
router.get('/all', adminMiddleware, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, first_name, last_name, email, role, phone_number, points, created_at, updated_at FROM users ORDER BY created_at DESC');
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Get all users error:', err.message);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้' });
    }
});

// ===================================
// GET /:id - ดึงข้อมูลผู้ใช้ตาม ID
// ===================================
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, first_name, last_name, email, role, phone_number, points, created_at, updated_at FROM users WHERE id = $1',
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้งาน' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Get user error:', err.message);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้' });
    }
});

// ===================================
// PUT /:id/add-points - เพิ่มคะแนนให้ผู้ใช้ (Admin Only)
// ===================================
router.put('/:id/add-points', adminMiddleware, async (req, res) => {
    try {
        const { points } = req.body;
        const userId = req.params.id;

        if (!points || points <= 0) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุจำนวนคะแนนที่ถูกต้อง' });
        }

        const result = await pool.query(
            'UPDATE users SET points = points + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [points, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้งาน' });
        }

        res.json({ success: true, message: `เพิ่ม ${points} คะแนนสำเร็จ`, data: result.rows[0] });
    } catch (err) {
        console.error('Add points error:', err.message);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเพิ่มคะแนน' });
    }
});

// ===================================
// POST /forgot-password - ขอรีเซ็ตรหัสผ่าน (ส่ง OTP ทางอีเมล)
// ===================================
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกอีเมล' });
        }

        // ตรวจสอบว่ามีผู้ใช้อีเมลนี้
        const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบอีเมลนี้ในระบบ' });
        }

        // สร้าง OTP 6 หลัก
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const id = crypto.randomBytes(16).toString('hex').toUpperCase();

        // บันทึก OTP ลงตาราง password_resets (หมดอายุใน 15 นาที)
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        await pool.query(
            "INSERT INTO password_resets (id, email, otp, expires_at) VALUES ($1, $2, $3, $4)",
            [id, email, otp, expiresAt]
        );

        // พยายามส่งอีเมลด้วย nodemailer
        try {
            const nodemailer = require('nodemailer');
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT || 587,
                secure: false,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });

            await transporter.sendMail({
                from: process.env.SMTP_FROM || 'noreply@lxshop.com',
                to: email,
                subject: 'LX Shop - รหัส OTP สำหรับรีเซ็ตรหัสผ่าน',
                html: `<h2>รหัส OTP ของคุณคือ: <strong>${otp}</strong></h2><p>รหัสนี้จะหมดอายุภายใน 15 นาที</p>`
            });

            console.log(`📧 ส่ง OTP ${otp} ไปที่ ${email} สำเร็จ`);
        } catch (mailErr) {
            // หาก SMTP ไม่ได้ตั้งค่า ให้ Log OTP ลง Console แทน
            console.log(`📧 [SMTP ไม่พร้อมใช้งาน] OTP สำหรับ ${email}: ${otp}`);
        }

        res.json({ success: true, message: 'ส่งรหัส OTP ไปที่อีเมลของคุณแล้ว' });
    } catch (err) {
        console.error('Forgot password error:', err.message);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการส่ง OTP' });
    }
});

// ===================================
// POST /reset-password - รีเซ็ตรหัสผ่านด้วย OTP
// ===================================
router.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, new_password } = req.body;

        if (!email || !otp || !new_password) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
        }

        // ตรวจสอบ OTP ที่ยังไม่หมดอายุ
        const now = new Date().toISOString();
        const otpResult = await pool.query(
            "SELECT id FROM password_resets WHERE email = $1 AND otp = $2 AND expires_at > $3",
            [email, otp, now]
        );

        if (otpResult.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'รหัส OTP ไม่ถูกต้องหรือหมดอายุแล้ว' });
        }

        // อัปเดตรหัสผ่านใหม่
        const password_hash = hashPassword(new_password);
        await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
            [password_hash, email]
        );

        // ลบ OTP ที่ใช้แล้ว
        await pool.query('DELETE FROM password_resets WHERE email = $1', [email]);

        res.json({ success: true, message: 'รีเซ็ตรหัสผ่านสำเร็จ! กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่' });
    } catch (err) {
        console.error('Reset password error:', err.message);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน' });
    }
});

// ===================================
// POST /redeem-coupon - แลกคะแนนเป็นคูปองส่วนลด (Auth Required)
// ===================================
router.post('/redeem-coupon', authMiddleware, async (req, res) => {
    try {
        const { points_cost } = req.body;
        const userId = req.user.id;

        // ตาราง Tiers ที่อนุญาต
        const rewardTiers = {
            500: 50,
            1000: 120,
            2000: 300
        };

        if (!rewardTiers[points_cost]) {
            return res.status(400).json({
                success: false,
                message: 'จำนวนคะแนนไม่ถูกต้อง กรุณาเลือก 500, 1000 หรือ 2000 คะแนน'
            });
        }

        const discountAmount = rewardTiers[points_cost];

        // ตรวจสอบคะแนนของผู้ใช้
        const userResult = await pool.query('SELECT points FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้งาน' });
        }

        const currentPoints = userResult.rows[0].points;
        if (currentPoints < points_cost) {
            return res.status(400).json({
                success: false,
                message: `คะแนนไม่เพียงพอ (มี ${currentPoints} คะแนน ต้องการ ${points_cost} คะแนน)`
            });
        }

        // สร้างโค้ดคูปอง REWARD-XXXXXX
        const couponCode = 'REWARD-' + crypto.randomBytes(3).toString('hex').toUpperCase();
        const couponId = crypto.randomBytes(16).toString('hex').toUpperCase();

        // เพิ่มคูปองลงตาราง promo_codes
        await pool.query(
            'INSERT INTO promo_codes (id, code, discount_amount, discount_type, is_active) VALUES ($1, $2, $3, $4, $5)',
            [couponId, couponCode, discountAmount, 'fixed', 1]
        );

        // หักคะแนนผู้ใช้
        await pool.query(
            'UPDATE users SET points = points - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [points_cost, userId]
        );

        res.json({
            success: true,
            message: `แลกคูปองสำเร็จ! ลด ${discountAmount} บาท`,
            data: {
                code: couponCode,
                discount_amount: discountAmount,
                discount_type: 'fixed',
                points_used: points_cost
            }
        });
    } catch (err) {
        console.error('Redeem coupon error:', err.message);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการแลกคูปอง' });
    }
});

module.exports = router;
