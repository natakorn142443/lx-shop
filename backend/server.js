// ===================================
// server.js - จุดเริ่มต้นหลักของ Backend Server.
// ===================================
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// เสิร์ฟไฟล์ HTML, CSS หน้าเว็บจากโฟลเดอร์หลัก (d:\LX Shop)
app.use(express.static(path.join(__dirname, '..')));

// Middleware
app.use(cors()); // อนุญาตให้หน้าเว็บ HTML ของเราเรียก API ได้
app.use(express.json()); // รับข้อมูลแบบ JSON

// Routes
const productsRouter = require('./routes/products');
const categoriesRouter = require('./routes/categories');
const usersRouter = require('./routes/users');
const ordersRouter = require('./routes/orders');
const reviewsRouter = require('./routes/reviews');
const wishlistsRouter = require('./routes/wishlists');
const adminRouter = require('./routes/admin');
const bannersRouter = require('./routes/banners');
const chatRouter = require('./routes/chat');
const consignmentsRouter = require('./routes/consignments');

app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/users', usersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/wishlists', wishlistsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/banners', bannersRouter);
app.use('/api/chat', chatRouter);
app.use('/api/consignments', consignmentsRouter);


// ===================================
// Upload Route (Multer)
// ===================================
const multer = require('multer');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' || ext === '.jpg' || ext === '.jpeg') {
            cb(null, true);
        } else {
            cb(new Error('รองรับเฉพาะไฟล์ .jpg และ .jpeg เท่านั้น!'), false);
        }
    }
});

app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'ไม่พบไฟล์ที่อัปโหลด หรือไฟล์ไม่รองรับ' });
    }
    // ส่ง path รูปแบบ URL กลับไป
    res.json({ success: true, url: `/uploads/${req.file.filename}` });
});

// Error handling for multer
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, message: err.message });
    } else if (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
    next();
});

// Route หลัก - ส่งหน้าเว็บ index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Route สำหรับหน้า Product Detail
app.get('/product', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'product.html'));
});

// ===================================
// Live Chat (Socket.IO) Setup
// ===================================
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});
app.set('io', io);

io.on('connection', (socket) => {
    // เมื่อลูกค้าหรือแขกเข้าแชท ยึดตามไอดีผู้ใช้คงที่
    socket.on('join_chat', (data) => {
        socket.userId = data.userId;
        socket.userName = data.name || 'ลูกค้าทั่วไป';
        socket.join(`room_${data.userId}`);
        
        // แจ้งเตือนแอดมินว่าผู้ใช้คนนี้ออนไลน์
        io.to('admin_room').emit('user_online', {
            userId: data.userId,
            name: socket.userName,
            socketId: socket.id
        });
    });

    // เมื่อลูกค้าส่งข้อความ
    socket.on('user_message', async (data) => {
        const userId = socket.userId || 'guest_unknown';
        const name = socket.userName || data.name || 'ลูกค้าทั่วไป';
        
        try {
            const pool = require('./db');
            await pool.query(
                'INSERT INTO chat_messages (user_id, sender_type, message, sender_name) VALUES ($1, $2, $3, $4)',
                [userId, 'user', data.text, name]
            );
        } catch (err) {
            console.error('Error saving user message to database:', err.message);
        }

        // ส่งแจ้งเตือนแชทใหม่เข้า Discord Webhook แอดมิน
        try {
            const { sendDiscordNotification } = require('./discordNotify');
            sendDiscordNotification(`💬 **แชทใหม่จากคุณ ${name}:**\n"${data.text}"`);
        } catch (errLine) {
            console.error('Error sending chat message discord notify:', errLine.message);
        }

        io.to('admin_room').emit('new_user_message', {
            userId: userId,
            socketId: socket.id,
            text: data.text,
            name: name,
            time: new Date()
        });
    });

    // เมื่อแอดมินเข้าระบบ
    socket.on('join_admin', () => {
        socket.join('admin_room');
    });

    // เมื่อแอดมินตอบกลับลูกค้า
    socket.on('admin_reply', async (data) => {
        const { toUserId, text } = data;
        
        try {
            const pool = require('./db');
            await pool.query(
                'INSERT INTO chat_messages (user_id, sender_type, message, sender_name) VALUES ($1, $2, $3, $4)',
                [toUserId, 'admin', text, 'Admin']
            );
        } catch (err) {
            console.error('Error saving admin message to database:', err.message);
        }

        // ส่งข้อความหาห้องแชทของลูกค้ารายนั้นๆ
        io.to(`room_${toUserId}`).emit('admin_reply_message', {
            text: text,
            time: new Date()
        });
    });

    socket.on('disconnect', () => {
        if (socket.userId) {
            io.to('admin_room').emit('user_offline', { userId: socket.userId });
        }
    });
});

// เริ่มเซิร์ฟเวอร์
server.listen(PORT, () => {
    console.log(`\n🚀 LX Shop Backend Server เปิดทำงานที่ http://localhost:${PORT}`);
    console.log(`📦 Products API: http://localhost:${PORT}/api/products`);
    console.log(`🗂️  Categories API: http://localhost:${PORT}/api/categories`);
    console.log(`👤 Users API: http://localhost:${PORT}/api/users`);
    console.log(`🛒 Orders API: http://localhost:${PORT}/api/orders\n`);
});
