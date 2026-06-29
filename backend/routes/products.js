const express = require('express');
const router = express.Router();
const pool = require('../db');
const { adminMiddleware } = require('../auth');

// GET / - list all active products with optional search, category filter, sorting
router.get('/', async (req, res) => {
  try {
    const { search, category, sort } = req.query;

    let query = `
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = TRUE
    `;
    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (p.name LIKE $${paramIndex} OR p.description LIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (category) {
      query += ` AND p.category_id = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    switch (sort) {
      case 'price_asc':
        query += ' ORDER BY p.price ASC';
        break;
      case 'price_desc':
        query += ' ORDER BY p.price DESC';
        break;
      case 'newest':
        query += ' ORDER BY p.created_at DESC';
        break;
      default:
        query += ' ORDER BY p.created_at DESC';
    }

    const { rows } = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error listing products:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve products' });
  }
});

// GET /:id - get single product by id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Error getting product:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve product' });
  }
});

// POST / - create product (admin only)
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const {
      category_id, name, description, price, discount_price, promo_tag,
      condition_level, warranty_status, stock_quantity, cost_price,
      image_url, spec_socket, spec_wattage, is_active
    } = req.body;

    const id = require('crypto').randomBytes(16).toString('hex');
    const now = new Date().toISOString();

    const { rows } = await pool.query(
      `INSERT INTO products (
        id, category_id, name, description, price, discount_price, promo_tag,
        condition_level, warranty_status, stock_quantity, cost_price,
        image_url, spec_socket, spec_wattage, is_active, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
      ) RETURNING *`,
      [
        id, category_id, name, description, price, discount_price || null, promo_tag || null,
        condition_level || null, warranty_status || null, stock_quantity || 0, cost_price || null,
        image_url || null, spec_socket || null, spec_wattage || null,
        is_active !== undefined ? (is_active === true || is_active === 1 || is_active === '1' || is_active === 'true') : true, now, now
      ]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ success: false, message: 'Failed to create product' });
  }
});

// PUT /:id - update product (admin only)
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const {
      category_id, name, description, price, discount_price, promo_tag,
      condition_level, warranty_status, stock_quantity, cost_price,
      image_url, spec_socket, spec_wattage, is_active
    } = req.body;

    const now = new Date().toISOString();

    const { rows, rowCount } = await pool.query(
      `UPDATE products SET
        category_id = $1, name = $2, description = $3, price = $4,
        discount_price = $5, promo_tag = $6, condition_level = $7,
        warranty_status = $8, stock_quantity = $9, cost_price = $10,
        image_url = $11, spec_socket = $12, spec_wattage = $13,
        is_active = $14, updated_at = $15
      WHERE id = $16
      RETURNING *`,
      [
        category_id, name, description, price, discount_price, promo_tag,
        condition_level, warranty_status, stock_quantity, cost_price,
        image_url, spec_socket, spec_wattage, is_active !== undefined ? (is_active === true || is_active === 1 || is_active === '1' || is_active === 'true') : true, now, req.params.id
      ]
    );

    if (rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ success: false, message: 'Failed to update product' });
  }
});

// DELETE /:id - soft delete product (admin only)
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const now = new Date().toISOString();

    const { rowCount } = await pool.query(
      `UPDATE products SET is_active = FALSE, updated_at = $1 WHERE id = $2`,
      [now, req.params.id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
});

// POST /ai-recommend-spec - ให้ AI คำนวณและแนะนำจัดสเปคคอมตามงบประมาณ
router.post('/ai-recommend-spec', async (req, res) => {
  try {
    const { budget, focus } = req.body;
    const budgetLimit = parseFloat(budget) || 20000;

    // ดึงสินค้าทั้งหมดในระบบ
    const { rows: products } = await pool.query(
      `SELECT p.*, c.name AS category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.is_active = TRUE`
    );

    // แยกประเภทสินค้าและเรียงจากถูกไปแพง
    const getItems = (keyword) => products
      .filter(p => p.category_name && p.category_name.includes(keyword))
      .sort((a,b) => (parseFloat(a.discount_price || a.price) - parseFloat(b.discount_price || b.price)));

    const cpus = getItems('ซีพียู');
    const mbs = getItems('เมนบอร์ด');
    const rams = getItems('แรม');
    const gpus = getItems('การ์ดจอ');
    const storages = getItems('เก็บข้อมูล');
    const psus = getItems('พาวเวอร์');
    const cases = getItems('เคส');

    let spec = { cpu: null, mb: null, ram: null, gpu: null, storage: null, psu: null, case: null, totalPrice: 0 };
    
    // เลือกชิ้นที่ถูกที่สุดเป็นค่าเริ่มต้น (ถ้ามีของ)
    if (cpus.length > 0) spec.cpu = cpus[0];
    if (mbs.length > 0) {
      spec.mb = mbs.find(m => !spec.cpu || !m.spec_socket || !spec.cpu.spec_socket || m.spec_socket === spec.cpu.spec_socket) || mbs[0];
    }
    if (rams.length > 0) spec.ram = rams[0];
    if (gpus.length > 0) spec.gpu = gpus[0];
    if (storages.length > 0) spec.storage = storages[0];
    if (psus.length > 0) spec.psu = psus[0];
    if (cases.length > 0) spec.case = cases[0];

    const calcTotal = (s) => Object.values(s).reduce((sum, item) => sum + (item && item.price ? parseFloat(item.discount_price || item.price) : 0), 0);
    
    let currentTotal = calcTotal(spec);
    
    // อัพเกรดชิ้นส่วนถ้ายังมีงบเหลือ
    const upgrade = (category, items) => {
       if (items.length <= 1 || !spec[category]) return;
       for (let i = items.length - 1; i >= 0; i--) {
          const item = items[i];
          // ข้ามเมนบอร์ดที่ซ็อกเก็ตไม่ตรงกัน
          if (category === 'mb' && spec.cpu && item.spec_socket && spec.cpu.spec_socket && item.spec_socket !== spec.cpu.spec_socket) continue;
          
          const priceDiff = parseFloat(item.discount_price || item.price) - parseFloat(spec[category].discount_price || spec[category].price);
          if (priceDiff > 0 && currentTotal + priceDiff <= budgetLimit) {
             spec[category] = item;
             currentTotal += priceDiff;
             break; // อัพเกรดไปตัวที่แรงที่สุดเท่าที่งบถึง
          }
       }
    };

    // จัดลำดับการอัพเกรดตาม Focus
    if (focus === 'gaming') {
       upgrade('gpu', gpus);
       upgrade('cpu', cpus);
       upgrade('ram', rams);
    } else {
       upgrade('cpu', cpus);
       upgrade('ram', rams);
       upgrade('gpu', gpus);
    }
    upgrade('storage', storages);
    upgrade('mb', mbs);
    upgrade('psu', psus);
    upgrade('case', cases);

    spec.totalPrice = calcTotal(spec);

    res.json({ success: true, data: spec });
  } catch (err) {
    console.error('AI Spec recommendation error:', err);
    res.status(500).json({ success: false, message: 'การคำนวณจัดสเปคของ AI ล้มเหลว' });
  }
});

module.exports = router;
