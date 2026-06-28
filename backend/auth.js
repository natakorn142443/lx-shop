// ===================================
// auth.js - ระบบการตรวจสอบความถูกต้องและ Middleware ป้องกันสิทธิ์
// ===================================
const crypto = require('crypto');
const JWT_SECRET = process.env.JWT_SECRET || 'lx_shop_secret_key_987654321';

// สร้างลายเซ็นโทเค็น (Zero-dependency JWT-like implementation)
function signToken(payload) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const data = Buffer.from(JSON.stringify({
        ...payload,
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // มีอายุใช้งาน 24 ชั่วโมง
    })).toString('base64url');
    const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${data}`).digest('base64url');
    return `${header}.${data}.${signature}`;
}

// ตรวจสอบความถูกต้องของโทเค็น
function verifyToken(token) {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [header, data, signature] = parts;
    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${data}`).digest('base64url');
    
    if (signature !== expectedSignature) return null;
    
    try {
        const decoded = JSON.parse(Buffer.from(data, 'base64url').toString());
        // ตรวจสอบวันหมดอายุ (Expiration)
        if (decoded.exp && Math.floor(Date.now() / 1000) > decoded.exp) {
            return null; // หมดอายุ
        }
        return decoded;
    } catch (e) {
        return null;
    }
}

// Middleware ยืนยันสิทธิ์สมาชิกทั่วไป (Customer/User)
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded) {
        return res.status(401).json({ success: false, message: 'เซสชันหมดอายุหรือข้อมูลไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่' });
    }
    
    req.user = decoded;
    next();
}

// Middleware ยืนยันสิทธิ์เฉพาะแอดมิน (Admin Only)
function adminMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบแอดมินก่อนดำเนินการ' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded) {
        return res.status(401).json({ success: false, message: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' });
    }
    
    if (decoded.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลส่วนนี้ (Admin Only)' });
    }
    
    req.user = decoded;
    next();
}

module.exports = {
    signToken,
    verifyToken,
    authMiddleware,
    adminMiddleware
};
