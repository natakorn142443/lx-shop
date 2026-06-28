// ===================================
// slipVerifier.js - โมดูลถอดรหัส QR Code จากสลิปโอนเงิน (สแกนสลิปฟรี)
// ===================================
const Jimp = require('jimp');
const jsQR = require('jsqr');

/**
 * ฟังก์ชันแกะข้อมูล QR Code จากรูปสลิป
 * @param {string} imagePath - ที่อยู่พาธไฟล์รูปสลิปบนเซิร์ฟเวอร์
 * @returns {Promise<string|null>} ข้อมูล QR Payload หรือ null หากไม่มี QR/แกะไม่ได้
 */
async function extractSlipQr(imagePath) {
    try {
        console.log(`🖼️ [Slip Verifier] กำลังประมวลผลสแกนรูป: ${imagePath}`);
        const image = await Jimp.read(imagePath);
        
        // ดึงพิกเซลข้อมูลสีภาพ กว้าง ยาว
        const { data, width, height } = image.bitmap;
        
        // ใช้ jsQR สแกนค้นหาตำแหน่งและถอดรหัสคิวอาร์โค้ด
        const code = jsQR(new Uint8ClampedArray(data), width, height);
        
        if (code) {
            console.log(`✅ [Slip Verifier] ตรวจพบ QR Payload: ${code.data.substring(0, 40)}...`);
            return code.data;
        }
        
        console.log(`ℹ️ [Slip Verifier] ไม่พบ QR Code บนสลิปนี้`);
        return null;
    } catch (err) {
        console.error('❌ [Slip Verifier] เกิดข้อผิดพลาดในการแกะข้อมูลรูปสลิป:', err.message);
        return null;
    }
}

module.exports = { extractSlipQr };
