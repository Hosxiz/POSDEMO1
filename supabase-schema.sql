-- Schema สำหรับระบบ POS (Supabase SQL Editor)
-- คัดลอกโค้ดนี้ไปรันใน Supabase -> SQL Editor ได้ทันทีเมื่อสร้างโปรเจกต์เสร็จ

-- 1. ตารางสินค้า (Products)
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'ทั่วไป',
  price numeric(10, 2) not null default 0,
  stock integer not null default 30,
  image_url text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. ตารางการสั่งซื้อ / บิลขาย (Orders)
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null,       -- เช่น Q-001
  total_amount numeric(10, 2) not null default 0,
  payment_method text not null default 'cash', -- 'cash', 'qr'
  amount_received numeric(10, 2) default 0,
  change_amount numeric(10, 2) default 0,
  order_items jsonb not null default '[]'::jsonb, -- รายการสินค้าในบิล
  order_date date not null default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security (RLS) policies ตัวอย่างให้สาธารณะอ่านและเพิ่มได้ (anon access)
alter table products enable row level security;
alter table orders enable row level security;

create policy "Allow anon read products" on products for select using (true);
create policy "Allow anon insert products" on products for insert with check (true);
create policy "Allow anon update products" on products for update using (true);
create policy "Allow anon delete products" on products for delete using (true);

create policy "Allow anon read orders" on orders for select using (true);
create policy "Allow anon insert orders" on orders for insert with check (true);
create policy "Allow anon delete orders" on orders for delete using (true);

-- สินค้าตัวอย่างเริ่มต้น
insert into products (name, category, price, stock, image_url) values
('ชาไทยเย็น (Thai Tea)', 'เครื่องดื่ม', 45.00, 30, ''),
('ชาเขียวมัทฉะลาเต้ (Matcha Latte)', 'เครื่องดื่ม', 55.00, 25, ''),
('อเมริกาโน่เย็น (Iced Americano)', 'กาแฟ', 50.00, 40, ''),
('ลาเต้เย็น (Iced Latte)', 'กาแฟ', 55.00, 35, ''),
('ชามะนาว (Lemon Tea)', 'เครื่องดื่ม', 45.00, 20, ''),
('ครัวซองต์เนยสด (Butter Croissant)', 'เบเกอรี่', 65.00, 15, ''),
('เค้กช็อกโกแลตฟัดจ์ (Chocolate Fudge)', 'เบเกอรี่', 75.00, 8, ''),
('คุกกี้ช็อกโกแลตชิพ (Cookie)', 'เบเกอรี่', 35.00, 5, '');
