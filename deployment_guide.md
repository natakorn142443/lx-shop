# 🚀 คู่มือการนำ LX Shop ขึ้นระบบคลาวด์ Render.com + PostgreSQL (Production Mode)

คู่มือนี้จะแนะนำขั้นตอนทั้งหมดสำหรับผู้ใช้ในการนำโครงการขึ้นระบบคลาวด์จริง เพื่อให้คนอื่นเข้าใช้งานได้ตลอด 24 ชั่วโมง

---

## 🗄️ ขั้นตอนที่ 1: สร้างฐานข้อมูล PostgreSQL ฟรี (แนะนำ Neon.tech)
เนื่องจากเราไม่สามารถใช้ SQLite บน Render ได้ (ข้อมูลจะหายเมื่อรีสตาร์ท) เราจึงต้องใช้ฐานข้อมูล PostgreSQL ภายนอก:
1. เข้าไปที่เว็บ [https://neon.tech](https://neon.tech) และสมัครสมาชิกฟรี
2. สร้างโครงการใหม่ (Create a project) เลือก Region ที่ใกล้ไทยที่สุด (เช่น Singapore หรือ Asia Pacific)
3. เมื่อสร้างเสร็จแล้ว คุณจะได้ **Connection String** หน้าตาแบบนี้:
   `postgresql://neondb_owner:password@ep-cool-water-a5xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
4. คัดลอกเก็บไว้ (เราจะนำไปใช้เป็นค่า `DATABASE_URL` ใน Render)

---

## 💻 ขั้นตอนที่ 2: อัปโหลดโค้ดขึ้น GitHub ของคุณ
เนื่องจาก Render ดึงโค้ดไปรันจาก GitHub:
1. เข้าเว็บ [https://github.com](https://github.com) และสร้าง Repository ใหม่ ตั้งชื่อว่า `lx-shop` (ตั้งค่าเป็น **Public** หรือ **Private** ก็ได้)
2. เปิดโปรแกรม Command Prompt / PowerShell ในคอมพิวเตอร์ของคุณแล้วไปที่โฟลเดอร์โครงการ:
   ```bash
   cd "C:\LX Shop"
   ```
3. นำคำสั่งในหน้า GitHub มาเชื่อมและ Push โค้ดที่จัดเตรียมไว้ขึ้นไป:
   ```bash
   git branch -M main
   git remote add origin https://github.com/ชื่อผู้ใช้ของคุณ/lx-shop.git
   git push -u origin main
   ```

---

## ☁️ ขั้นตอนที่ 3: ดีพลอยขึ้น Render.com ด้วย 1-Click Blueprints
Render สามารถอ่านไฟล์ [render.yaml](file:///c:/LX%20Shop/render.yaml) ที่ผมสร้างไว้ให้ได้ทันที ทำให้ตั้งค่าง่ายมาก:
1. เข้าเว็บ [https://render.com](https://render.com) สมัครสมาชิกและเชื่อมต่อกับบัญชี GitHub ของคุณ
2. ที่หน้า Dashboard กดปุ่ม **New +** แล้วเลือก **Blueprint**
3. เลือก Repository `lx-shop` ที่เพิ่งอัปโหลด
4. ระบบจะอ่านค่าตั้งค่าทั้งหมดอัตโนมัติ ให้คุณกรอกค่าตัวแปรในช่องว่างดังนี้:
   * **DATABASE_URL**: ใส่ Connection String ที่ได้มาจาก Neon.tech ในขั้นตอนที่ 1
   * **DISCORD_WEBHOOK_URL** (ถ้ามี): ใส่ลิงก์ส่งการแจ้งเตือน Discord
   * **GEMINI_API_KEY** (ถ้ามี): ใส่ API Key สำหรับแชทบอท
5. กดปุ่ม **Apply** เพื่อเริ่มดีพลอย! รอระบบเซ็ตอัปประมาณ 2-3 นาที จะได้ลิงก์เว็บใช้งานจริง เช่น `https://lx-shop.onrender.com`

---

## 🗂️ ขั้นตอนที่ 4: เริ่มต้นสร้างตาราง (Setup Database Tables)
เมื่อเว็บใน Render รันสำเร็จครั้งแรกแล้ว ฐานข้อมูล PostgreSQL ของคุณจะยังว่างเปล่าอยู่ ให้ทำตามขั้นตอนนี้เพื่อสร้างตารางและลงข้อมูลตัวอย่างสินค้า:
1. ที่หน้า Dashboard ของ Render คลิกเข้าไปที่บริการเว็บเซอร์วิสของคุณ (`lx-shop`)
2. ที่แถบเมนูด้านซ้าย เลือก **Shell** เพื่อเข้าหน้าคอมมานด์ไลน์ของเซิร์ฟเวอร์คลาวด์
3. พิมพ์คำสั่งรันสร้างตารางระบบจริง:
   ```bash
   npm run setup
   ```
4. เมื่อมีข้อความขึ้นเตือน `🎉 สร้างและเพิ่มข้อมูลฐานข้อมูลสำหรับ PostgreSQL สำเร็จพร้อมใช้งานแล้ว!` เป็นอันเสร็จสิ้นโครงการ! ระบบพร้อมใช้งานทันทีครับ 🚀
