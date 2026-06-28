// init-db.js - เริ่มต้นฐานข้อมูลแบบรองรับทั้ง SQLite และ PostgreSQL
require('dotenv').config();
const pool = require('./db');
const fs = require('fs');
const path = require('path');

// เช็คว่าเป็นโหมด PostgreSQL หรือไม่
const isPostgres = !!(process.env.DATABASE_URL || process.env.PGHOST);

async function init() {
    console.log(`🔄 กำลังเริ่มต้นสร้างฐานข้อมูล (${isPostgres ? 'PostgreSQL' : 'SQLite'})...`);

    try {
        // 1. อ่านและรันไฟล์ Schema
        const schemaFile = isPostgres ? 'schema.postgres.sql' : 'schema.sqlite.sql';
        const schema = fs.readFileSync(path.join(__dirname, schemaFile), 'utf-8');
        
        console.log(`📦 รัน Schema จากไฟล์ ${schemaFile}...`);
        
        const statements = schema
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            try {
                console.log(`⏳ รัน SQL: ${statement.substring(0, 50).replace(/\n/g, ' ')}...`);
                await pool.query(statement);
            } catch (stmtErr) {
                console.error(`❌ ข้อผิดพลาดในคำสั่ง SQL:`, statement);
                console.error(`รายละเอียด:`, stmtErr.message);
                throw stmtErr;
            }
        }
        console.log('✅ สร้างตารางสำเร็จ');

        // 2. เคลียร์ข้อมูลเก่าเฉพาะตารางหลักสำหรับการทดสอบ
        console.log('🧹 เคลียร์ข้อมูลเก่า...');
        await pool.query('DELETE FROM order_items');
        await pool.query('DELETE FROM orders');
        await pool.query('DELETE FROM products');
        await pool.query('DELETE FROM categories');
        await pool.query('DELETE FROM promo_codes');

        // 3. เพิ่มข้อมูลหมวดหมู่ (Categories)
        console.log('📁 กำลังเพิ่มหมวดหมู่สินค้า...');
        const categoriesData = [
            ['การ์ดจอ (GPU)', 'การ์ดจอสำหรับเล่นเกมและงานกราฟิก'],
            ['ซีพียู (CPU)', 'หน่วยประมวลผลกลาง'],
            ['แรม (RAM)', 'หน่วยความจำหลัก'],
            ['เมนบอร์ด (MB)', 'แผงวงจรหลัก'],
            ['อุปกรณ์เกมมิ่ง', 'คีย์บอร์ด เมาส์ หูฟัง จอมอนิเตอร์']
        ];

        const catMap = {};
        for (const [name, desc] of categoriesData) {
            if (isPostgres) {
                const res = await pool.query(
                    'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING id',
                    [name, desc]
                );
                catMap[name] = res.rows[0].id;
            } else {
                // SQLite
                await pool.query('INSERT INTO categories (name, description) VALUES ($1, $2)', [name, desc]);
                // ดึง id ล่าสุด
                const res = await pool.query("SELECT last_insert_rowid() as id");
                catMap[name] = res.rows[0].id;
            }
        }
        console.log('✅ เพิ่มหมวดหมู่สินค้าสำเร็จ');

        // 4. เพิ่มข้อมูลสินค้า (Products)
        console.log('📦 กำลังเพิ่มสินค้า...');
        const productsData = [
            [catMap['การ์ดจอ (GPU)'], 'NVIDIA GeForce RTX 3080 Founders Edition 10GB', 'ทดสอบแล้วทำงานได้สมบูรณ์ อุปกรณ์และกล่องครบ ไม่เคยนำไปขุดคริปโต ทาซิลิโคนใหม่ด้วย Thermal Grizzly Kryonaut อุณหภูมิไม่เกิน 70°C', 14500, 'สภาพ 99%', 'รับประกัน 30 วัน (จากทางร้าน)', 1, 'https://images.unsplash.com/photo-1591488320449-011701bb6704?q=80&w=600&auto=format&fit=crop'],
            [catMap['การ์ดจอ (GPU)'], 'MSI GeForce RTX 4070 GAMING X TRIO 12GB', 'สภาพดีมาก ใช้งานเล่นเกมอย่างเดียว พัดลมเงียบ ไม่มีรอยขีดข่วน กล่องครบ', 16900, 'สภาพ 95%', 'รับประกัน 30 วัน (จากทางร้าน)', 1, 'https://images.unsplash.com/photo-1622957461168-8a9d3f1b7e2f?q=80&w=600&auto=format&fit=crop'],
            [catMap['ซีพียู (CPU)'], 'AMD Ryzen 9 5900X 12-Core 24-Thread', 'มีเฉพาะตัวซีพียู ไม่เคยโอเวอร์คล็อก ใช้งานในระบบชุดน้ำเปิด', 8200, 'ไม่มีกล่อง', 'หมดประกันศูนย์', 1, 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?q=80&w=600&auto=format&fit=crop'],
            [catMap['ซีพียู (CPU)'], 'Intel Core i7-13700K 16-Core', 'สภาพใหม่มาก ใช้ได้ไม่ถึง 3 เดือน กล่องครบ มีใบรับประกัน', 9500, 'สภาพ 99%', 'เหลือประกันศูนย์ 2 ปี', 1, 'https://images.unsplash.com/photo-1555617981-dac3880eac6e?q=80&w=600&auto=format&fit=crop'],
            [catMap['แรม (RAM)'], 'Corsair Vengeance DDR5 32GB (2x16GB) 5600MHz', 'แรมชุดคู่ใส่คอมมาไม่ถึงปี เปลี่ยนเป็นรุ่นที่สูงกว่า XMP ใช้ได้ปกติ', 3200, 'สภาพนางฟ้า', 'เหลือประกันศูนย์ตลอดอายุการใช้งาน', 2, 'https://images.unsplash.com/photo-1592664474505-51c549ad15c5?q=80&w=600&auto=format&fit=crop'],
            [catMap['เมนบอร์ด (MB)'], 'ASUS ROG Strix B550-F Gaming Wi-Fi', 'อุปกรณ์ครบกล่อง อัปเดต BIOS ล่าสุดสำหรับ Zen 3 แล้ว', 4500, 'สภาพนางฟ้า', 'รับประกัน 30 วัน (จากทางร้าน)', 1, 'https://images.unsplash.com/photo-1626084013098-b80c35f7956b?q=80&w=600&auto=format&fit=crop'],
            [catMap['อุปกรณ์เกมมิ่ง'], 'Logitech G Pro X Mechanical Gaming Keyboard', 'สวิตช์ GX Blue ทำความสะอาดแล้ว คีย์แคปแทบไม่มีรอยลอก', 2900, 'สภาพ 95%', 'หมดประกันศูนย์', 1, 'https://images.unsplash.com/photo-1615663245857-ac1e653815c7?q=80&w=600&auto=format&fit=crop'],
            [catMap['อุปกรณ์เกมมิ่ง'], 'Razer DeathAdder V3 Pro Wireless Mouse', 'เมาส์ไร้สายเกรดแข่งขัน น้ำหนักเบา 63g สภาพสวย ไม่มีรอย', 2500, 'สภาพ 99%', 'เหลือประกันศูนย์ 1 ปี', 1, 'https://images.unsplash.com/photo-1527814050087-3793815479db?q=80&w=600&auto=format&fit=crop']
        ];

        for (const p of productsData) {
            await pool.query(
                `INSERT INTO products (category_id, name, description, price, condition_level, warranty_status, stock_quantity, image_url) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                p
            );
        }
        console.log('✅ เพิ่มสินค้า 8 รายการสำเร็จ');

        // 5. เพิ่มโค้ดส่วนลด (Promo Codes)
        console.log('🔑 กำลังเพิ่มโค้ดส่วนลดตัวอย่าง...');
        await pool.query("INSERT INTO promo_codes (code, discount_amount, discount_type) VALUES ('NEWGAMER', 100, 'fixed')");
        await pool.query("INSERT INTO promo_codes (code, discount_amount, discount_type) VALUES ('LXSHOP10', 10, 'percent')");

        // 6. เซ็ตสินค้าลดราคาโปรโมชัน
        console.log('🏷️ เซ็ตสินค้าโปรโมชัน...');
        await pool.query("UPDATE products SET discount_price = 13900, promo_tag = '🔥 Hot Deal' WHERE name LIKE '%RTX 3080%'");
        await pool.query("UPDATE products SET discount_price = 2990, promo_tag = '⚡ ลดล้างสต็อก' WHERE name LIKE '%Corsair Vengeance%'");

        console.log(`\n🎉 สร้างและเพิ่มข้อมูลฐานข้อมูลสำหรับ ${isPostgres ? 'PostgreSQL' : 'SQLite'} สำเร็จพร้อมใช้งานแล้ว!`);
    } catch (err) {
        console.error('❌ เกิดข้อผิดพลาดในการรัน Setup:', err.message);
    } finally {
        process.exit();
    }
}

init();
