// migrate_advanced.js - สคริปต์อัปเดตตารางสำหรับบอร์ดฝากขาย C2C (Advanced Phase)
const pool = require('./db');

async function migrate() {
    try {
        console.log('🔄 กำลังเชื่อมต่อและอัปเดตตารางในฐานข้อมูล...');

        console.log('📦 1. สร้างตาราง consignments...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS consignments (
                id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
                user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
                product_name TEXT NOT NULL,
                category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
                price REAL NOT NULL CHECK (price >= 0),
                description TEXT,
                image_url TEXT,
                contact_info TEXT NOT NULL,
                status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'sold')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('⚡ 2. สร้าง Index สำหรับการค้นหาสินค้าฝากขาย...');
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_consignments_user ON consignments(user_id);
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_consignments_status ON consignments(status);
        `);

        console.log('✅ การอัปเกรดฐานข้อมูลสำหรับ C2C Consignment สำเร็จ!');
    } catch (err) {
        console.error('❌ เกิดข้อผิดพลาดในการรัน Migration:', err.message);
    } finally {
        process.exit();
    }
}

migrate();
