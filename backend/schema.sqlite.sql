-- 1. ตารางผู้ใช้งาน Users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    phone_number TEXT,
    points INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. ตารางหมวดหมู่สินค้า Categories
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. ตารางสินค้า Products
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL CHECK (price >= 0),
    discount_price REAL DEFAULT NULL,
    promo_tag TEXT DEFAULT NULL,
    condition_level TEXT NOT NULL,
    warranty_status TEXT NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 1 CHECK (stock_quantity >= 0),
    cost_price REAL,
    image_url TEXT,
    spec_socket TEXT,
    spec_wattage INTEGER,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. ตารางคำสั่งซื้อ Orders
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    user_id TEXT REFERENCES users(id) ON DELETE RESTRICT,
    total_amount REAL NOT NULL CHECK (total_amount >= 0),
    discount_applied REAL DEFAULT 0,
    promo_code TEXT DEFAULT NULL,
    payment_method TEXT DEFAULT NULL,
    payment_slip_url TEXT DEFAULT NULL,
    payment_slip_qr TEXT DEFAULT NULL,
    payment_status TEXT DEFAULT 'pending',
    points_earned INTEGER DEFAULT 0,
    points_used INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled')),
    shipping_address TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. ตารางรายละเอียดคำสั่งซื้อ Order Items
CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price REAL NOT NULL CHECK (unit_price >= 0),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. ตารางบันทึกการนำเข้าสต๊อก Stock Imports
CREATE TABLE IF NOT EXISTS stock_imports (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    cost_price REAL NOT NULL CHECK (cost_price >= 0),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Promo Codes
CREATE TABLE IF NOT EXISTS promo_codes (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    code TEXT UNIQUE NOT NULL,
    discount_amount REAL NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('fixed', 'percent')),
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. Reviews
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. Wishlists
CREATE TABLE IF NOT EXISTS wishlists (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_stock_imports_product ON stock_imports(product_id);

-- 10. Banners
CREATE TABLE IF NOT EXISTS banners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_url TEXT NOT NULL,
    link_url TEXT,
    is_active BOOLEAN DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 11. ตารางเก็บประวัติแชท Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    user_id TEXT NOT NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
    message TEXT NOT NULL,
    sender_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);

-- 12. ตารางรหัสผ่านความปลอดภัยสำหรับการกู้คืน Password Resets
CREATE TABLE IF NOT EXISTS password_resets (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    email TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);

-- 13. ตารางฝากขายสินค้าของลูกค้า C2C Consignments
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
CREATE INDEX IF NOT EXISTS idx_consignments_user ON consignments(user_id);
CREATE INDEX IF NOT EXISTS idx_consignments_status ON consignments(status);



