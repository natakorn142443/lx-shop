// migrate.js - สคริปต์อัปเดตฐานข้อมูลสำหรับระบบโปรโมชั่น
const pool = require('./db');

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('📦 1. อัปเดตตาราง products...');
        await client.query(`
            ALTER TABLE products 
            ADD COLUMN IF NOT EXISTS discount_price DECIMAL(10, 2) DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS promo_tag VARCHAR(50) DEFAULT NULL;
        `);

        console.log('🎁 2. สร้างตาราง promo_codes...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS promo_codes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                code VARCHAR(50) UNIQUE NOT NULL,
                discount_amount DECIMAL(10, 2) NOT NULL,
                discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('fixed', 'percent')),
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('🛒 3. อัปเดตตาราง orders...');
        await client.query(`
            ALTER TABLE orders 
            ADD COLUMN IF NOT EXISTS discount_applied DECIMAL(10, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS promo_code VARCHAR(50) DEFAULT NULL;
        `);

        // ใส่ข้อมูลโค้ดตัวอย่าง
        console.log('🔑 4. เพิ่มโค้ดส่วนลดตัวอย่าง...');
        await client.query(`
            INSERT INTO promo_codes (code, discount_amount, discount_type) 
            VALUES 
            ('NEWGAMER', 100, 'fixed'),
            ('LXSHOP10', 10, 'percent')
            ON CONFLICT (code) DO NOTHING;
        `);

        // ตั้งค่าสินค้าตัวอย่างให้มีส่วนลด
        console.log('🏷️ 5. เซ็ตสินค้าลดราคาตัวอย่าง...');
        await client.query(`
            UPDATE products SET discount_price = 13900, promo_tag = '🔥 Hot Deal' 
            WHERE name ILIKE '%RTX 3080%';
            
            UPDATE products SET discount_price = 2990, promo_tag = '⚡ ลดล้างสต็อก'
            WHERE name ILIKE '%Corsair Vengeance%';
        `);

        await client.query('COMMIT');
        console.log('✅ อัปเดตฐานข้อมูลสำเร็จ!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ เกิดข้อผิดพลาด:', err.message);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();
