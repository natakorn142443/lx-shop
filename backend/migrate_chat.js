// migrate_chat.js - สคริปต์อัปเดตตารางสำหรับระบบแชทลงฐานข้อมูล SQLite/PostgreSQL
const pool = require('./db');

async function migrate() {
    try {
        console.log('💬 กำลังสร้างตาราง chat_messages...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS chat_messages (
                id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
                user_id TEXT NOT NULL,
                sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
                message TEXT NOT NULL,
                sender_name TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('⚡ สร้าง Index สำหรับความเร็วในการค้นหา...');
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);
        `);

        console.log('✅ อัปเดตตารางประวัติแชทสำเร็จ!');
    } catch (err) {
        console.error('❌ เกิดข้อผิดพลาดในการรัน Migration แชท:', err.message);
    } finally {
        process.exit();
    }
}

migrate();
