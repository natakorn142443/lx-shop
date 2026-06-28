// ===================================
// routes/chat.js - ระบบแชทสด (ดึงประวัติแชท, รายชื่อผู้ใช้แชท)
// ===================================
const express = require('express');
const router = express.Router();
const pool = require('../db');

// ===================================
// GET /history/:userId - ดึงประวัติแชทของผู้ใช้
// ===================================
router.get('/history/:userId', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM chat_messages WHERE user_id = $1 ORDER BY created_at ASC',
            [req.params.userId]
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Get chat history error:', err.message);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงประวัติแชท' });
    }
});

// ===================================
// GET /users - ดึงรายชื่อผู้ใช้ที่เคยแชท (พร้อมข้อความล่าสุดและจำนวนข้อความ)
// ===================================
router.get('/users', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                cm.user_id,
                cm.sender_name,
                COUNT(*) AS message_count,
                MAX(cm.created_at) AS last_message_at,
                (SELECT message FROM chat_messages cm2
                 WHERE cm2.user_id = cm.user_id
                 ORDER BY cm2.created_at DESC LIMIT 1) AS last_message
             FROM chat_messages cm
             GROUP BY cm.user_id, cm.sender_name
             ORDER BY last_message_at DESC`
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Get chat users error:', err.message);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงรายชื่อผู้ใช้แชท' });
    }
});

// ===================================
// POST /ai - แชทบอท AI ช่างเทคนิคให้คำแนะนำลูกค้า
// ===================================
const https = require('https');

router.post('/ai', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกข้อความ' });
        }

        // ดึงข้อมูลสินค้าที่พร้อมขาย
        const { rows: products } = await pool.query(
            `SELECT p.name, p.price, p.condition_level, p.warranty_status 
             FROM products p 
             WHERE p.is_active = 1 AND p.stock_quantity > 0`
        );
        const productContext = products.map(p => `- ${p.name} ราคา ฿${p.price.toLocaleString()} (สภาพ: ${p.condition_level || 'N/A'}, ประกัน: ${p.warranty_status || 'N/A'})`).join('\n');

        const geminiKey = process.env.GEMINI_API_KEY;
        if (geminiKey) {
            const systemInstruction = 
                `คุณคือบอท AI ฝ่ายบริการลูกค้านามว่า "ช่างหนุ่มไอที" ประจำร้าน LX Shop ร้านขายอะไหล่และคอมพิวเตอร์มือสองสไตล์ Gaming\n` +
                `หน้าที่ของคุณคือการให้คำปรึกษาปัญหาฮาร์ดแวร์ไอที, การอัพเกรดคอม, และช่วยแนะนำสินค้าในร้านตามงบประมาณของลูกค้า\n` +
                `จงตอบลูกค้าด้วยน้ำเสียงสุภาพ เป็นกันเอง มีความกระตือรือร้นในการตอบแบบช่างคอมมืออาชีพ\n\n` +
                `นี่คือรายการสินค้ามือสองที่มีจำหน่ายอยู่ในร้าน ณ ขณะนี้:\n${productContext}\n\n` +
                `กฎการแนะนำ:\n` +
                `1. แนะนำสินค้าที่มีอยู่จริงในร้านด้านบนเท่านั้น หากไม่มี ให้แจ้งข้อมูลไปตรง ๆ และช่วยแนะนำสเปคทางเลือกกว้าง ๆ\n` +
                `2. ตอบเป็นภาษาไทยอย่างชัดเจน กระชับ ไม่พิมพ์ยืดยาวจนเกินไป`;

            const postData = JSON.stringify({
                contents: [{ parts: [{ text: message }] }],
                systemInstruction: { parts: [{ text: systemInstruction }] },
                generationConfig: { maxOutputTokens: 500, temperature: 0.7 }
            });

            const reqOptions = {
                hostname: 'generativelanguage.googleapis.com',
                port: 443,
                path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const apiReq = https.request(reqOptions, (apiRes) => {
                let body = '';
                apiRes.on('data', chunk => body += chunk);
                apiRes.on('end', () => {
                    try {
                        const json = JSON.parse(body);
                        if (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts[0]) {
                            const aiResponse = json.candidates[0].content.parts[0].text;
                            res.json({ success: true, message: aiResponse });
                        } else {
                            console.error('Gemini error response:', body);
                            res.json({ success: true, message: getRuleBasedResponse(message, products) });
                        }
                    } catch (e) {
                        console.error('Parsing Gemini response error:', e);
                        res.json({ success: true, message: getRuleBasedResponse(message, products) });
                    }
                });
            });

            apiReq.on('error', (err) => {
                console.error('Gemini connection error:', err);
                res.json({ success: true, message: getRuleBasedResponse(message, products) });
            });

            apiReq.write(postData);
            apiReq.end();
        } else {
            res.json({ success: true, message: getRuleBasedResponse(message, products) });
        }
    } catch (err) {
        console.error('AI chat error:', err.message);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการประมวลผลแชทบอท' });
    }
});

// Rule-based chatbot engine (Fallback)
function getRuleBasedResponse(msg, products) {
    const text = msg.toLowerCase();
    
    if (text.includes('สวัสดี') || text.includes('หวัดดี') || text.includes('hi') || text.includes('hello')) {
        return 'สวัสดีครับผม! ผมคือบอท "ช่างหนุ่มไอที" ยินดีให้คำแนะนำเกี่ยวกับเรื่องคอมพิวเตอร์และอะไหล่มือสองครับ วันนี้ต้องการให้ช่วยจัดสเปคคอม แนะนำอุปกรณ์ หรือปรึกษาปัญหาเรื่องใดดีครับ?';
    }
    
    if (text.includes('จัดสเปค') || text.includes('แนะนำคอม') || text.includes('งบ')) {
        const cpuList = products.filter(p => p.name.toLowerCase().includes('ryzen') || p.name.toLowerCase().includes('intel') || p.name.toLowerCase().includes('core'));
        const gpuList = products.filter(p => p.name.toLowerCase().includes('rtx') || p.name.toLowerCase().includes('gtx') || p.name.toLowerCase().includes('geforce'));
        
        let reply = 'หากกำลังมองหาสเปคประกอบเล่นเกม ผมขอแนะนำชิ้นส่วนอะไหล่มือสองเด่น ๆ ในร้าน ณ ตอนนี้ครับ:\n';
        if (cpuList.length > 0) reply += `- ซีพียู: ${cpuList[0].name} (฿${cpuList[0].price.toLocaleString()})\n`;
        if (gpuList.length > 0) reply += `- การ์ดจอ: ${gpuList[0].name} (฿${gpuList[0].price.toLocaleString()})\n`;
        reply += '\nสามารถลองกดหน้าจัดสเปคคอมเพื่อเช็คราคาและจัดสเปคที่ต้องการได้เลยครับ!';
        return reply;
    }
    
    if (text.includes('การรับประกัน') || text.includes('ประกัน') || text.includes('กี่วัน')) {
        return 'สินค้ามือสองทุกชิ้นจากทางร้านเราผ่านการทดสอบ Benchmark และทำความสะอาดคราบฝุ่นเรียบร้อยครับ โดยทางร้านมีการรับประกันสินค้าให้ 30 วันนับจากวันที่ได้รับของ หากพบปัญหาการใช้งานสามารถแจ้งเครมเปลี่ยนตัวใหม่หรือขอคืนเงินได้เต็มจำนวนครับ!';
    }
    
    if (text.includes('คอขวด') || text.includes('bottleneck')) {
        return 'อาการคอขวดเกิดจากหน่วยประมวลผล (CPU) หรือการ์ดจอ (GPU) ฝั่งใดฝั่งหนึ่งมีความแรงน้อยกว่าอีกฝั่งมาก ทำให้ทำงานได้ไม่เต็มที่ แนะนำให้เลือกสเปคที่ความแรงใกล้เคียงกัน เช่น Ryzen 5 หรือ Core i5 คู่กับการ์ดจอระดับกลาง (RTX 3060/4060) ครับ';
    }

    if (text.includes('ติดต่อ') || text.includes('ร้านตั้งอยู่') || text.includes('เบอร์โทร')) {
        return 'ร้าน LX Shop ตั้งอยู่ที่ กรุงเทพมหานคร ครับ สามารถสอบถามแอดมินหรือทักแชทคนจริงในโหมด "คุยกับเจ้าหน้าที่" ได้เลยครับ หรือโทรเบอร์ด่วน 099-XXX-XXXX ได้เลยครับ!';
    }

    const matched = products.filter(p => p.name.toLowerCase().includes(text));
    if (matched.length > 0) {
        return `เรามีสินค้าที่อาจจะตรงกับความต้องการของคุณครับ:\n- ${matched[0].name} ราคา ฿${matched[0].price.toLocaleString()} (ประกัน: ${matched[0].warranty_status})\nสนใจรายละเอียดตัวนี้ สามารถแชทคุยกับทีมงานคนจริงได้เลยนะครับ!`;
    }

    return 'ขออภัยด้วยครับผม พอดีข้อมูลคำถามของพี่ค่อนข้างมีรายละเอียดเฉพาะตัว หากต้องการแนะนำสินค้าเป็นกรณีพิเศษ หรือสอบถามสัญญารับซื้อ/เทิร์น แนะนำเปลี่ยนเป็นห้องแชท "คุยกับเจ้าหน้าที่" เพื่อพิมพ์คุยกับแอดมินโดยตรงได้เลยครับ!';
}

module.exports = router;
