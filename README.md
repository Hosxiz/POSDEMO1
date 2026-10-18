# คู่มือการใช้งานและ Deploy ระบบ POS สู่ Cloudflare Pages + Supabase

## 1. คำสั่งและการทดสอบรันในเครื่อง (Local Development & Testing)

เปิดโปรแกรม Terminal หรือ PowerShell ในโฟลเดอร์โปรเจกต์นี้ แล้วใช้คำสั่งดังนี้:

### 🚀 1.1 เปิดเซิร์ฟเวอร์ระบบ POS (หน้าเว็บ)
```powershell
npm run dev
```
- เมื่อรันแล้ว เปิดเบราว์เซอร์ไปที่: 👉 **http://localhost:5173/**
- กด `Ctrl + C` ใน Terminal เมื่อต้องการหยุดการทำงาน

### 🧪 1.2 ทดสอบระบบอัตโนมัติ (Automated Unit Tests)
```powershell
npm test
```
*(ระบบจะรัน Vitest ทดสอบฟังก์ชันคำนวณเงิน, ระบบ Option สินค้า, การตัดสต็อก และความถูกต้องของข้อมูลทั้งหมด)*

### 📦 1.3 ทดสอบการ Build ระบบ (Production Build)
```powershell
npm run build
```
*(ทดสอบแพ็กเกจไฟล์สำหรับนำขึ้นโฮสติ้งจริง ตรวจสอบว่าไม่มีโค้ดหรือไฟล์ใด error)*

---

### 💻 การทำงานหลักหน้าร้าน:
1. **เลือกสินค้า & Option:** กดการ์ดสินค้าเพื่อเลือก Option (เช่น หวานน้อย, แยกน้ำ, พิเศษ) หรือกดข้ามเพื่อใส่ตะกร้าทันที
2. **ออกใบคิว 1-Click (ปุ่ม F9):** สั่งพิมพ์ใบคิวผ่านเครื่องพิมพ์ความร้อนแบบหน้าร้าน (Thermal Printer) ได้รวดเร็วโดยไม่ค้างหน้าจอ
3. **📊 สรุปยอดขาย:** ดูยอดขายรวม, จำนวนบิล, ค่าเฉลี่ยต่อบิล และสั่งพิมพ์ใบสรุปยอดขายประจำวัน
4. **⚙️ ตั้งค่าร้านค้า:** ปรับเปลี่ยนชื่อร้าน, สาขา และข้อความท้ายใบเสร็จ โดยจะอัปเดตทั้งบนหน้าเว็บและบนหัวกระดาษพิมพ์อัตโนมัติ
5. **📦 จัดการสินค้า & สต็อก:** เพิ่ม แก้ไข ลบ เมนูสินค้า และกำหนดสต็อกคงเหลือ (ระบุหรือไม่ระบุก็ได้)

---

## 2. การเชื่อมต่อ Supabase Database
ระบบรองรับโหมด **ออฟไลน์ (LocalStorage)** เป็นค่าเริ่มต้น และสามารถเชื่อมต่อ Supabase ได้ 2 วิธี:

### วิธีที่ 1: ผ่าน Environment Variables (แนะนำสำหรับการ Deploy จริง - ซ่อนการตั้งค่าจากหน้าร้าน 100%)
1. ตั้งค่า Environment Variables ใน Cloudflare Pages หรือสร้างไฟล์ `.env.local`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_KEY=your-anon-key
   ```
2. เมื่อระบบโหลดค่าเชื่อมต่อออนไลน์สำเร็จ **ปุ่มและหน้าต่างตั้งค่า Supabase จะถูกซ่อนออกจากหน้าผู้ใช้งานหน้าร้านโดยอัตโนมัติ** เพื่อความปลอดภัยและไม่ให้พนักงานแคชเชียร์กดแก้ไข

### วิธีที่ 2: ตั้งค่าผ่านหน้าเว็บ (สำหรับทดสอบในเครื่อง)
1. กดที่ปุ่ม **"โหมด Local (ออฟไลน์)"** มุมขวาบน
2. วาง URL และ Anon Key แล้วกด **บันทึกการเชื่อมต่อ**
3. เมื่อเชื่อมต่อสำเร็จ ปุ่มจะถูกซ่อนออกจากหน้าจอหน้าร้านทันที

---

## 3. วิธี Deploy ขึ้น Cloudflare Pages (ฟรี 100%)

### ตัวเลือกที่ 1: Deploy ผ่าน Cloudflare Dashboard (ผูกกับ GitHub)
1. Push โค้ดในโฟลเดอร์นี้ขึ้น GitHub
2. เข้าสู่ [dash.cloudflare.com](https://dash.cloudflare.com/) -> ไปที่ **Workers & Pages** -> **Create application** -> แท็บ **Pages** -> **Connect to Git**
3. เลือก Repository ที่สร้างขึ้น
4. ตั้งค่า Build settings:
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
5. กด **Save and Deploy** จะได้ URL ใช้งานทันที เช่น `https://my-pos.pages.dev`

### ตัวเลือกที่ 2: Deploy ตรงผ่าน Wrangler CLI
```bash
npx wrangler pages deploy dist --project-name=pos-store
```
