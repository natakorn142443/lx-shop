// ===================================
// db.js - เชื่อมต่อกับ SQLite หรือ PostgreSQL แบบไดนามิก
// ===================================
const path = require('path');

let pool;

if (process.env.DATABASE_URL || process.env.PGHOST) {
    // โหมด PostgreSQL (สำหรับระบบจริง - Production Mode)
    const { Pool } = require('pg');
    const pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        host: process.env.PGHOST,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        port: process.env.PGPORT || 5432,
        ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') ? { rejectUnauthorized: false } : false
    });

    console.log('🔌 เชื่อมต่อฐานข้อมูล PostgreSQL (Production Mode)');
    
    pool = {
        query: (text, params) => pgPool.query(text, params),
        connect: () => pgPool.connect()
    };
} else {
    // โหมด SQLite (สำหรับจำลองพัฒนาระบบเครื่องโลคอล - Local Dev Mode)
    const sqlite3 = require('sqlite3').verbose();
    const { open } = require('sqlite');

    let dbPromise = open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    }).then(db => {
        console.log('✅ เชื่อมต่อฐานข้อมูล SQLite สำเร็จ! (Local Dev Mode)');
        return db;
    }).catch(err => {
        console.error('❌ เชื่อมต่อฐานข้อมูล SQLite ไม่สำเร็จ:', err.message);
    });

    pool = {
        query: async (text, params = []) => {
            const db = await dbPromise;
            
            // แปลง $1, $2 เป็น ? (SQLite placeholder)
            let sqliteText = text.replace(/\$\d+/g, '?');
            
            // แปลง ILIKE เป็น LIKE (SQLite ไม่มี ILIKE และ LIKE ไม่สนใจตัวพิมพ์เล็กใหญ่ตามค่าเริ่มต้นอยู่แล้ว)
            sqliteText = sqliteText.replace(/ILIKE/g, 'LIKE');
            
            try {
                // เช็คว่าเป็นการ Query แบบ SELECT หรือมี RETURNING หรือไม่
                const isSelectOrReturning = /^(SELECT|PRAGMA|WITH)/i.test(sqliteText.trim()) || /RETURNING/i.test(sqliteText);
                
                if (isSelectOrReturning) {
                    const rows = await db.all(sqliteText, params);
                    return { rows, rowCount: rows.length };
                } else {
                    const result = await db.run(sqliteText, params);
                    return { rows: [], rowCount: result.changes };
                }
            } catch (err) {
                console.error("DB Query Error:", err.message, "\nQuery:", sqliteText);
                throw err;
            }
        },
        // Mock connection สำหรับ SQL Transactions
        connect: async () => {
            return {
                query: pool.query,
                release: () => {}
            };
        }
    };
}

module.exports = pool;
