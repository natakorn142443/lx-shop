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

    // แยกประเภทสินค้า
    const cpus = products.filter(p => p.category_name && p.category_name.includes('ซีพียู'));
    const mbs = products.filter(p => p.category_name && p.category_name.includes('เมนบอร์ด'));
    const rams = products.filter(p => p.category_name && p.category_name.includes('แรม'));
    const gpus = products.filter(p => p.category_name && p.category_name.includes('การ์ดจอ'));

    // Fallbacks สินค้าที่ยังไม่มีในฐานข้อมูล
    const fallbackStorage = { id: 'fb-storage', name: 'Kingston NV2 1TB M.2 NVMe SSD', price: 2190, category_name: 'ที่เก็บข้อมูล (Storage)', image_url: 'https://images.unsplash.com/photo-1597852074816-d933c7d2b988?w=200' };
    const fallbackPsu = { id: 'fb-psu', name: 'MSI MAG A650BN 650W 80 Plus Bronze', price: 1850, category_name: 'พาวเวอร์ซัพพลาย (PSU)', spec_wattage: 650, image_url: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=200' };
    const fallbackCase = { id: 'fb-case', name: 'Montech Air 903 Base Black ATX Case', price: 1450, category_name: 'เคส (Case)', image_url: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=200' };

    let bestCombination = null;
    let bestTotal = 0;

    // หาชุดคอมพิวเตอร์ที่เข้ากันได้และให้ผลรวมใกล้เคียงงบที่สุด
    for (const cpu of cpus) {
      for (const mb of mbs) {
        // เช็คการเข้ากันได้ของ Socket
        if (cpu.spec_socket && mb.spec_socket && cpu.spec_socket !== mb.spec_socket) {
          continue;
        }
        for (const ram of rams) {
          for (const gpu of gpus) {
            const total = (parseFloat(cpu.price) || 0) + 
                          (parseFloat(mb.price) || 0) + 
                          (parseFloat(ram.price) || 0) + 
                          (parseFloat(gpu.price) || 0) +
                          fallbackStorage.price + 
                          fallbackPsu.price + 
                          fallbackCase.price;

            if (total <= budgetLimit && total > bestTotal) {
              bestTotal = total;
              bestCombination = {
                cpu,
                mb,
                ram,
                gpu,
                storage: fallbackStorage,
                psu: fallbackPsu,
                case: fallbackCase,
                totalPrice: total
              };
            }
          }
        }
      }
    }

    // หากไม่พบชุดประกอบในงบ ให้สเปคที่ถูกที่สุด
    if (!bestCombination) {
      const cheapestCpu = cpus.sort((a,b) => a.price - b.price)[0] || { id: 'fb-cpu', name: 'AMD Ryzen 5 3600', price: 2500, spec_socket: 'AM4', category_name: 'ซีพียู', image_url: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=200' };
      const cheapestMb = mbs.filter(m => !m.spec_socket || !cheapestCpu.spec_socket || m.spec_socket === cheapestCpu.spec_socket).sort((a,b) => a.price - b.price)[0] || { id: 'fb-mb', name: 'Gigabyte A520M S2H', price: 1990, spec_socket: 'AM4', category_name: 'เมนบอร์ด', image_url: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=200' };
      const cheapestRam = rams.sort((a,b) => a.price - b.price)[0] || { id: 'fb-ram', name: 'Hiksemi DDR4 16GB (8GBx2) 3200MHz', price: 1350, category_name: 'แรม', image_url: 'https://images.unsplash.com/photo-1597852074816-d933c7d2b988?w=200' };
      const cheapestGpu = gpus.sort((a,b) => a.price - b.price)[0] || { id: 'fb-gpu', name: 'NVIDIA GTX 1650 4GB', price: 2800, category_name: 'การ์ดจอ', image_url: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=200' };

      const total = cheapestCpu.price + cheapestMb.price + cheapestRam.price + cheapestGpu.price + 
                    fallbackStorage.price + fallbackPsu.price + fallbackCase.price;

      bestCombination = {
        cpu: cheapestCpu,
        mb: cheapestMb,
        ram: cheapestRam,
        gpu: cheapestGpu,
        storage: fallbackStorage,
        psu: fallbackPsu,
        case: fallbackCase,
        totalPrice: total
      };
    }

    res.json({ success: true, data: bestCombination });
  } catch (err) {
    console.error('AI Spec recommendation error:', err);
    res.status(500).json({ success: false, message: 'การคำนวณจัดสเปคของ AI ล้มเหลว' });
  }
});

module.exports = router;
