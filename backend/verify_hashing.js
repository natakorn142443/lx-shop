const pool = require('./db');
const crypto = require('crypto');

// Helper Functions for Password Hashing (scrypt)
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, storedPassword) {
    try {
        const [salt, key] = storedPassword.split(':');
        const hash = crypto.scryptSync(password, salt, 64).toString('hex');
        return key === hash;
    } catch (e) {
        return false;
    }
}

async function run() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('=== LX Shop Database Users Status ===');
        try {
            const result = await pool.query('SELECT id, first_name, last_name, email, role, password_hash FROM users');
            if (result.rows.length === 0) {
                console.log('No users found in database.');
            } else {
                console.table(result.rows.map(user => ({
                    id: user.id.substring(0, 8),
                    name: `${user.first_name} ${user.last_name}`,
                    email: user.email,
                    role: user.role,
                    is_hashed: (user.password_hash && user.password_hash.includes(':')) ? '✅ Hashed (scrypt)' : '❌ Plaintext (Unsafe)'
                })));
            }
        } catch (e) {
            console.error('Error fetching users:', e.message);
        }
        
        console.log('\nUsage:');
        console.log('  node verify_hashing.js --hash <password>                     Hash a password');
        console.log('  node verify_hashing.js --verify <password> <hash>            Verify a password against a hash');
        console.log('  node verify_hashing.js --create-admin <email> <password> <first_name> <last_name>  Create an admin user');
        console.log('  node verify_hashing.js --make-admin <email>                  Promote a user to admin');
        process.exit(0);
    }

    const command = args[0];
    
    if (command === '--hash') {
        const password = args[1];
        if (!password) {
            console.error('Error: Please provide a password to hash.');
            process.exit(1);
        }
        const hash = hashPassword(password);
        console.log(`Password: ${password}`);
        console.log(`Hash:     ${hash}`);
        process.exit(0);
    }
    
    if (command === '--verify') {
        const password = args[1];
        const hash = args[2];
        if (!password || !hash) {
            console.error('Error: Please provide both password and stored hash.');
            process.exit(1);
        }
        const isValid = verifyPassword(password, hash);
        console.log(`Password: ${password}`);
        console.log(`Hash:     ${hash}`);
        console.log(`Match:    ${isValid ? '✅ VALID' : '❌ INVALID'}`);
        process.exit(0);
    }
    
    if (command === '--create-admin') {
        const email = args[1];
        const password = args[2];
        const fname = args[3] || 'Admin';
        const lname = args[4] || 'User';
        
        if (!email || !password) {
            console.error('Error: Please provide email and password.');
            process.exit(1);
        }
        
        try {
            const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
            if (existing.rows.length > 0) {
                console.error(`Error: User with email ${email} already exists.`);
                process.exit(1);
            }
            
            const hashed = hashPassword(password);
            await pool.query(
                "INSERT INTO users (first_name, last_name, email, password_hash, role) VALUES ($1, $2, $3, $4, 'admin')",
                [fname, lname, email, hashed]
            );
            console.log(`✅ Admin user created successfully: ${email}`);
        } catch (e) {
            console.error('Error creating admin user:', e.message);
        }
        process.exit(0);
    }
    
    if (command === '--make-admin') {
        const email = args[1];
        if (!email) {
            console.error('Error: Please provide user email.');
            process.exit(1);
        }
        
        try {
            const result = await pool.query("UPDATE users SET role = 'admin' WHERE email = $1", [email]);
            if (result.rowCount === 0) {
                console.error(`Error: No user found with email ${email}`);
            } else {
                console.log(`✅ User with email ${email} promoted to admin successfully.`);
            }
        } catch (e) {
            console.error('Error updating user role:', e.message);
        }
        process.exit(0);
    }
    
    console.error(`Unknown option: ${command}`);
    process.exit(1);
}

run();
