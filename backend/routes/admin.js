// ===================================
// routes/admin.js - ระบบแดชบอร์ดแอดมิน (Analytics & Dashboard)
// ===================================
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { adminMiddleware } = require('../auth');

// ===================================
// GET /analytics - ข้อมูลสรุปสำหรับแดชบอร์ดแอดมิน
// ===================================
router.get('/analytics', adminMiddleware, async (req, res) => {
    try {
        // 1) ยอดรายได้รวม
        const revenueResult = await pool.query(
            "SELECT COALESCE(SUM(total_amount), 0) AS total_revenue FROM orders WHERE status != 'cancelled'"
        );
        const totalRevenue = revenueResult.rows[0].total_revenue;

        // 2) จำนวนคำสั่งซื้อทั้งหมด
        const ordersResult = await pool.query('SELECT COUNT(*) AS total_orders FROM orders');
        const totalOrders = ordersResult.rows[0].total_orders;

        // 3) จำนวนผู้ใช้ทั้งหมด
        const usersResult = await pool.query('SELECT COUNT(*) AS total_users FROM users');
        const totalUsers = usersResult.rows[0].total_users;

        // 4) จำนวนสินค้าทั้งหมด
        const productsResult = await pool.query('SELECT COUNT(*) AS total_products FROM products');
        const totalProducts = productsResult.rows[0].total_products;

        // 5) คำสั่งซื้อล่าสุด 5 รายการ
        const recentOrdersResult = await pool.query(
            `SELECT o.id, o.total_amount, o.status, o.created_at, u.first_name, u.last_name, u.email
             FROM orders o
             LEFT JOIN users u ON o.user_id = u.id
             ORDER BY o.created_at DESC
             LIMIT 5`
        );

        // 6) สินค้าขายดี (Top Products)
        const topProductsResult = await pool.query(
            `SELECT p.id, p.name, p.image_url, p.price, COALESCE(SUM(oi.quantity), 0) AS total_sold
             FROM products p
             LEFT JOIN order_items oi ON p.id = oi.product_id
             GROUP BY p.id, p.name, p.image_url, p.price
             ORDER BY total_sold DESC
             LIMIT 10`
        );

        // 7) รายได้รายเดือน (Monthly Revenue สำหรับกราฟ)
        const isPostgres = !!(process.env.DATABASE_URL || process.env.PGHOST);
        let monthlyRevenueQuery = "";
        if (isPostgres) {
            monthlyRevenueQuery = `
                SELECT to_char(created_at, 'YYYY-MM') AS month,
                       COALESCE(SUM(total_amount), 0) AS revenue,
                       COUNT(*) AS order_count
                FROM orders
                WHERE status != 'cancelled'
                GROUP BY to_char(created_at, 'YYYY-MM')
                ORDER BY month DESC
                LIMIT 12
            `;
        } else {
            monthlyRevenueQuery = `
                SELECT strftime('%Y-%m', created_at) AS month,
                       COALESCE(SUM(total_amount), 0) AS revenue,
                       COUNT(*) AS order_count
                FROM orders
                WHERE status != 'cancelled'
                GROUP BY strftime('%Y-%m', created_at)
                ORDER BY month DESC
                LIMIT 12
            `;
        }
        const monthlyRevenueResult = await pool.query(monthlyRevenueQuery);

        res.json({
            success: true,
            data: {
                total_revenue: totalRevenue,
                total_orders: totalOrders,
                total_users: totalUsers,
                total_products: totalProducts,
                recent_orders: recentOrdersResult.rows,
                top_products: topProductsResult.rows,
                monthly_revenue: monthlyRevenueResult.rows
            }
        });
    } catch (err) {
        console.error('Analytics error:', err.message);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ' });
    }
});

module.exports = router;
