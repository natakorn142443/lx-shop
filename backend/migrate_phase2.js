// migrate_phase2.js - สคริปต์อัปเดตตารางสำหรับระบบจัดการสลิปและกู้คืนบัญชี (เฟส 2)
const pool = require('./db');

async function migrate() {
    try {
        console.log('🛒 1. เพิ่มคอลัมน์ payment_slip_qr ในตาราง orders...');
        try {
            await pool.query('ALTER TABLE orders ADD COLUMN payment_slip_qr TEXT DEFAULT NULL;');
            console.log('✅ เพิ่มคอลัมน์ payment_slip_qr สำเร็จ');
        } catch (err) {
            // ใน SQLite อาจเกิดข้อผิดพลาดถ้ารายการมีอยู่แล้ว
            if (err.message.includes('duplicate column name') || err.message.includes('already exists')) {
                console.log('ℹ️ คอลัมน์ payment_slip_qr มีอยู่แล้วในระบบ');
            } else {
                console.warn('⚠️ ข้ามหรือเกิดปัญหาเล็กน้อยในการเพิ่มคอลัมน์:', err.message);
            }
        }

        console.log('🔑 2. สร้างตาราง password_resets...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS password_resets (
                id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
                email TEXT NOT NULL,
                otp TEXT NOT NULL,
                expires_at DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('⚡ 3. สร้าง Index สำหรับความเร็วในการค้นหา OTP...');
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
        `);

        console.log('✅ อัปเดตตารางความปลอดภัยและสลิป เฟส 2 สำเร็จ!');
    } catch (err) {
        console.error('❌ เกิดข้อผิดพลาดในการรัน Migration เฟส 2:', err.message);
    } finally {
        process.exit();
    }
}

migrate();
