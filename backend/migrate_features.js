const pool = require('./db');

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('⭐ 1. สร้างตาราง reviews...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                product_id UUID REFERENCES products(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('❤️ 2. สร้างตาราง wishlists...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS wishlists (
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                product_id UUID REFERENCES products(id) ON DELETE CASCADE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, product_id)
            );
        `);

        console.log('💳 3. อัปเดตตาราง orders สำหรับระบบชำระเงิน...');
        await client.query(`
            ALTER TABLE orders 
            ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cod',
            ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';
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
