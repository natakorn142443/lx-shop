// ===================================
// seed.js - เพิ่มข้อมูลตัวอย่างลงฐานข้อมูล
// ===================================
const pool = require('./db');

async function seed() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // ลบข้อมูลเดิม (ถ้ามี)
        await client.query('DELETE FROM order_items');
        await client.query('DELETE FROM orders');
        await client.query('DELETE FROM products');
        await client.query('DELETE FROM categories');

        // 1. เพิ่มหมวดหมู่
        console.log('📁 กำลังเพิ่มหมวดหมู่...');
        const categories = await client.query(`
            INSERT INTO categories (name, description) VALUES
            ('การ์ดจอ (GPU)', 'การ์ดจอสำหรับเล่นเกมและงานกราฟิก'),
            ('ซีพียู (CPU)', 'หน่วยประมวลผลกลาง'),
            ('แรม (RAM)', 'หน่วยความจำหลัก'),
            ('เมนบอร์ด (MB)', 'แผงวงจรหลัก'),
            ('อุปกรณ์เกมมิ่ง', 'คีย์บอร์ด เมาส์ หูฟัง จอมอนิเตอร์')
            RETURNING id, name
        `);
        
        const catMap = {};
        categories.rows.forEach(c => { catMap[c.name] = c.id; });
        console.log('✅ เพิ่มหมวดหมู่ 5 รายการสำเร็จ');

        // 2. เพิ่มสินค้า
        console.log('📦 กำลังเพิ่มสินค้า...');
        await client.query(`
            INSERT INTO products (category_id, name, description, price, condition_level, warranty_status, stock_quantity, image_url) VALUES
            ($1, 'NVIDIA GeForce RTX 3080 Founders Edition 10GB',
             'ทดสอบแล้วทำงานได้สมบูรณ์ อุปกรณ์และกล่องครบ ไม่เคยนำไปขุดคริปโต ทาซิลิโคนใหม่ด้วย Thermal Grizzly Kryonaut อุณหภูมิไม่เกิน 70°C',
             14500, 'สภาพ 99%', 'รับประกัน 30 วัน (จากทางร้าน)', 1,
             'https://images.unsplash.com/photo-1591488320449-011701bb6704?q=80&w=600&auto=format&fit=crop'),

            ($1, 'MSI GeForce RTX 4070 GAMING X TRIO 12GB',
             'สภาพดีมาก ใช้งานเล่นเกมอย่างเดียว พัดลมเงียบ ไม่มีรอยขีดข่วน กล่องครบ',
             16900, 'สภาพ 95%', 'รับประกัน 30 วัน (จากทางร้าน)', 1,
             'https://images.unsplash.com/photo-1622957461168-8a9d3f1b7e2f?q=80&w=600&auto=format&fit=crop'),

            ($2, 'AMD Ryzen 9 5900X 12-Core 24-Thread',
             'มีเฉพาะตัวซีพียู ไม่เคยโอเวอร์คล็อก ใช้งานในระบบชุดน้ำเปิด',
             8200, 'ไม่มีกล่อง', 'หมดประกันศูนย์', 1,
             'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?q=80&w=600&auto=format&fit=crop'),

            ($2, 'Intel Core i7-13700K 16-Core',
             'สภาพใหม่มาก ใช้ได้ไม่ถึง 3 เดือน กล่องครบ มีใบรับประกัน',
             9500, 'สภาพ 99%', 'เหลือประกันศูนย์ 2 ปี', 1,
             'https://images.unsplash.com/photo-1555617981-dac3880eac6e?q=80&w=600&auto=format&fit=crop'),

            ($3, 'Corsair Vengeance DDR5 32GB (2x16GB) 5600MHz',
             'แรมชุดคู่ใส่คอมมาไม่ถึงปี เปลี่ยนเป็นรุ่นที่สูงกว่า XMP ใช้ได้ปกติ',
             3200, 'สภาพนางฟ้า', 'เหลือประกันศูนย์ตลอดอายุการใช้งาน', 2,
             'https://images.unsplash.com/photo-1592664474505-51c549ad15c5?q=80&w=600&auto=format&fit=crop'),

            ($4, 'ASUS ROG Strix B550-F Gaming Wi-Fi',
             'อุปกรณ์ครบกล่อง อัปเดต BIOS ล่าสุดสำหรับ Zen 3 แล้ว',
             4500, 'สภาพนางฟ้า', 'รับประกัน 30 วัน (จากทางร้าน)', 1,
             'https://images.unsplash.com/photo-1626084013098-b80c35f7956b?q=80&w=600&auto=format&fit=crop'),

            ($5, 'Logitech G Pro X Mechanical Gaming Keyboard',
             'สวิตช์ GX Blue ทำความสะอาดแล้ว คีย์แคปแทบไม่มีรอยลอก',
             2900, 'สภาพ 95%', 'หมดประกันศูนย์', 1,
             'https://images.unsplash.com/photo-1615663245857-ac1e653815c7?q=80&w=600&auto=format&fit=crop'),

            ($5, 'Razer DeathAdder V3 Pro Wireless Mouse',
             'เมาส์ไร้สายเกรดแข่งขัน น้ำหนักเบา 63g สภาพสวย ไม่มีรอย',
             2500, 'สภาพ 99%', 'เหลือประกันศูนย์ 1 ปี', 1,
             'https://images.unsplash.com/photo-1527814050087-3793815479db?q=80&w=600&auto=format&fit=crop')
        `, [catMap['การ์ดจอ (GPU)'], catMap['ซีพียู (CPU)'], catMap['แรม (RAM)'], catMap['เมนบอร์ด (MB)'], catMap['อุปกรณ์เกมมิ่ง']]);

        console.log('✅ เพิ่มสินค้า 8 รายการสำเร็จ');

        await client.query('COMMIT');
        console.log('\n🎉 เพิ่มข้อมูลตัวอย่างทั้งหมดเรียบร้อย!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ เกิดข้อผิดพลาด:', err.message);
    } finally {
        client.release();
        process.exit();
    }
}

seed();
