-- เปิดใช้งาน UUID extension สำหรับสร้าง ID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ตารางผู้ใช้งาน Users (สำหรับลูกค้าและผู้ดูแลระบบ)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    phone_number VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. ตารางหมวดหมู่สินค้า Categories
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. ตารางสินค้า Products
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    condition_level VARCHAR(50) NOT NULL, -- เช่น 'สภาพ 99%', 'สภาพนางฟ้า', 'ไม่มีกล่อง'
    warranty_status VARCHAR(100) NOT NULL, -- เช่น 'รับประกัน 30 วัน', 'หมดประกัน'
    stock_quantity INTEGER NOT NULL DEFAULT 1 CHECK (stock_quantity >= 0),
    cost_price DECIMAL(10, 2), -- ราคาทุนล่าสุด
    image_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. ตารางคำสั่งซื้อ Orders (เก็บข้อมูลหลักของบิล)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    total_amount DECIMAL(12, 2) NOT NULL CHECK (total_amount >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled')),
    shipping_address TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. ตารางรายละเอียดคำสั่งซื้อ Order Items (จำเป็นมากสำหรับระบบ E-commerce เพื่อแยกสินค้าแต่ละชิ้นในบิล)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0), -- บันทึกราคาสินค้า ณ วันที่ซื้อ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- สร้าง Index เพื่อเพิ่มความเร็วในการค้นหาข้อมูล (Performance Optimization)
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- 6. ตารางบันทึกการนำเข้าสต๊อก Stock Imports (เพื่อคีย์สินค้านำเข้าและบันทึกราคาทุน)
CREATE TABLE stock_imports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    cost_price DECIMAL(10, 2) NOT NULL CHECK (cost_price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stock_imports_product ON stock_imports(product_id);
