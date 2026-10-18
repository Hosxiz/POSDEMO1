# POS Terminal - ระบบขายหน้าร้านอัจฉริยะ (Offline-First POS System)

ระบบขายหน้าร้าน (Point of Sale) สไตล์ Modern Minimal ออกแบบตามแนวคิด **Offline-First Resilience** ทำงานได้รวดเร็ว ลื่นไหล ไม่สะดุดแม้ไม่มีอินเทอร์เน็ต รองรับการเชื่อมต่อคลาวด์ฐานข้อมูลแบบไร้รอยต่อ และพิมพ์ใบเสร็จ/ใบคิวด่วนด้วยเครื่องพิมพ์ความร้อน (Thermal Printer)

---

## 🌟 ฟีเจอร์เด่นของระบบ (Key Features)

### 1. ⚡ โครงสร้าง Offline-First 100%
- ทำงานผ่าน **Local Storage** ทันทีตั้งแต่เปิดโปรแกรม ขายของได้ต่อเนื่องแม้อินเทอร์เน็ตหลุด
- มีระบบ Synchronization สลับไปใช้ **Supabase Cloud Database** อัตโนมัติเมื่อกำหนดค่า Environment Variables

### 2. 🧾 ระบบพิมพ์ใบคิว & สลิปความร้อน (Thermal Slip Printing)
- ออกแบบเฉพาะสำหรับเครื่องพิมพ์กระดาษความร้อนหน้าร้าน (ESC/POS 58mm / 80mm)
- **1-Click Print (Hotkey F9):** สั่งพิมพ์ใบคิวด่วนทันทีโดยไม่ต้องรอโหลดหน้าต่างพรีวิวซ้ำซ้อน
- แสดงเลขออเดอร์คิวขนาดใหญ่ ชัดเจน พร้อมรายละเอียดตัวเลือกสินค้าและข้อความท้ายบิล

### 3. 🎯 ตัวเลือกสินค้าด่วน & เมนูย่อย (Product Modifiers / Options)
- Preset ชิปตัวเลือกด่วน เช่น *หวานปกติ, หวานน้อย, ไม่หวาน, แยกน้ำ, พิเศษ*
- ช่องระบุหมายเหตุเฉพาะรายการเพิ่มเติม
- แยกรายการในตะกร้าอัตโนมัติหากสินค้าเดียวกันแต่มีตัวเลือกต่างกัน

### 4. 📦 บริหารสต็อกสินค้า & จัดการเมนู (Inventory Management)
- เพิ่ม/แก้ไข/ลบ เมนู พร้อมแบ่งหมวดหมู่อัตโนมัติ
- รองรับทั้งสินค้าแบบ **นับสต็อก** (ตัดสต็อกอัตโนมัติเมื่อปิดการขาย พร้อมแจ้งเตือนเมื่อสินค้าหมด) และสินค้าแบบ **ไม่จำกัดจำนวน**

### 5. 📊 สรุปยอดขาย & สถิติประจำวัน (Daily Sales Analytics)
- Dashboard แสดงยอดขายรวม (Total Sales), จำนวนบิล (Transactions), ยอดเฉลี่ยต่อบิล (AOV)
- สรุปสัดส่วนยอดขายตามหมวดหมู่สินค้า
- รองรับการสั่งพิมพ์ **"ใบสรุปยอดขายประจำวัน"** ออกทางเครื่องพิมพ์สลิป

### 6. ⚙️ ปรับแต่งข้อมูลร้านค้า (Store Customization)
- กำหนดชื่อร้าน, สาขา, สโลแกน และข้อความท้ายบิลได้เอง
- อัปเดตข้อมูลขึ้นหัวเว็บและหัวกระดาษสลิปพิมพ์ทันที

---

## 🛠️ สถาปัตยกรรมและเทคโนโลยี (Tech Stack)

- **Frontend Core:** Vanilla HTML5, CSS3, JavaScript (ES Modules)
- **Bundler & Build Tool:** [Vite](https://vitejs.dev/) - ความเร็วสูง ประสิทธิภาพระดับ Production
- **Database / Backend:** [Supabase](https://supabase.com/) (PostgreSQL + Realtime)
- **Icons & Effects:** Lucide Icons, Canvas Confetti
- **Testing Suite:** [Vitest](https://vitest.dev/) (Unit Tests สำหรับ Business Logic, Cart และ Inventory)

---

## 🚀 เริ่มต้นใช้งานและทดสอบในเครื่อง (Getting Started)

### ติดตั้ง Dependencies
```bash
npm install
```

### เปิดเซิร์ฟเวอร์หน้าร้าน (Development)
```bash
npm run dev
```
เปิดเบราว์เซอร์ที่: **http://localhost:5173/**

### ทดสอบ Unit Test อัตโนมัติ
```bash
npm test
```

### ตรวจสอบการ Build (Production Ready)
```bash
npm run build
```

---

## ☁️ การเชื่อมต่อระบบ Cloud (Supabase)

คัดลอกไฟล์ `.env.example` เป็น `.env.local` หรือตั้งค่าใน Hosting Environment:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=your-anon-key
```
นำโครงสร้างตารางจากไฟล์ `supabase-schema.sql` ไปรันใน SQL Editor บน Supabase Console เพื่อสร้างตาราง `products`, `orders`, `order_items` และ `store_settings`
