// ===================================
// discordNotify.js - โมดูลส่งแจ้งเตือนผ่าน Discord Webhook API (ฟรี ไม่จำกัด)
// ===================================
const https = require('https');
const { URL } = require('url');

/**
 * ส่งข้อความแจ้งเตือนเข้าเซิร์ฟเวอร์ Discord ผ่าน Webhook
 * @param {string} message - ข้อความที่ต้องการส่ง
 * @returns {Promise<boolean>} สถานะการส่ง
 */
function sendDiscordNotification(message) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
        console.log(`ℹ️ [Discord Notify] DISCORD_WEBHOOK_URL ไม่ได้กำหนดค่าในไฟล์ .env (ข้อความที่ข้ามส่ง: "${message}")`);
        return Promise.resolve(false);
    }

    return new Promise((resolve) => {
        try {
            const parsedUrl = new URL(webhookUrl);
            const postData = JSON.stringify({
                content: message
            });

            const options = {
                hostname: parsedUrl.hostname,
                port: 443,
                path: parsedUrl.pathname + parsedUrl.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        console.log('✅ [Discord Notify] ส่งแจ้งเตือนสำเร็จ!');
                        resolve(true);
                    } else {
                        console.error(`❌ [Discord Notify] ส่งแจ้งเตือนล้มเหลว (Status: ${res.statusCode}):`, body);
                        resolve(false);
                    }
                });
            });

            req.on('error', (e) => {
                console.error('❌ [Discord Notify] เกิดข้อผิดพลาดในการเชื่อมต่อ:', e.message);
                resolve(false);
            });

            req.write(postData);
            req.end();
        } catch (err) {
            console.error('❌ [Discord Notify] URL ของ Webhook ไม่ถูกต้อง:', err.message);
            resolve(false);
        }
    });
}

module.exports = { sendDiscordNotification };
