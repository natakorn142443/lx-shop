const pool = require('./db');

async function migrateStock() {
    try {
        console.log('Migrating database for Stock Import feature...');
        
        // 1. Add cost_price to products
        try {
            await pool.query(`ALTER TABLE products ADD COLUMN cost_price DECIMAL(10, 2);`);
            console.log('Added cost_price to products.');
        } catch (e) {
            console.log('cost_price column might already exist:', e.message);
        }

        // 2. Create stock_imports table
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS stock_imports (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
                    quantity INTEGER NOT NULL CHECK (quantity > 0),
                    cost_price DECIMAL(10, 2) NOT NULL CHECK (cost_price >= 0),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            `);
            console.log('Created stock_imports table.');
            
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_stock_imports_product ON stock_imports(product_id);`);
            console.log('Created index on stock_imports.');
        } catch (e) {
            console.log('Error creating stock_imports table:', e.message);
        }

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        pool.end();
    }
}

migrateStock();
