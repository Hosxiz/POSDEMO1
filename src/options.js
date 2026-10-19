/**
 * Dynamic contextual option presets based on product categories.
 */

export const CATEGORY_PRESETS = {
  beverage: [
    'หวานปกติ',
    'หวานน้อย (50%)',
    'หวาน 25%',
    'ไม่หวาน (0%)',
    'น้ำแข็งปกติ',
    'น้ำแข็งน้อย',
    'ไม่ใส่น้ำแข็ง',
    'แยกน้ำ',
    'ร้อน',
    'เย็น'
  ],
  food: [
    'ไม่เผ็ด',
    'เผ็ดน้อย',
    'เผ็ดกลาง',
    'เผ็ดมาก',
    'ไม่ใส่ผัก',
    'ไม่ใส่กระเทียม',
    'ไม่ใส่พริก',
    'พิเศษ'
  ],
  bakery: [
    'อุ่นร้อน',
    'ไม่ต้องการอุ่น',
    'ทานที่ร้าน',
    'ห่อกลับบ้าน',
    'แยกซอส'
  ],
  default: [
    'ทานที่ร้าน',
    'ห่อกลับบ้าน',
    'พิเศษ'
  ]
};

/**
 * Resolves appropriate option preset list according to category string.
 * @param {string} category 
 * @returns {string[]} Array of preset option strings
 */
export function getOptionsForCategory(category) {
  if (!category || typeof category !== 'string') {
    return [...CATEGORY_PRESETS.default];
  }

  const cat = category.toLowerCase().trim();

  // Beverages & Coffee
  const beverageKeywords = ['เครื่องดื่ม', 'ชา', 'กาแฟ', 'นม', 'น้ำ', 'สมูทตี้', 'โซดา', 'drink', 'beverage', 'tea', 'coffee', 'latte'];
  if (beverageKeywords.some(kw => cat.includes(kw))) {
    return [...CATEGORY_PRESETS.beverage];
  }

  // Food & Dishes
  const foodKeywords = ['อาหาร', 'ข้าว', 'ก๋วยเตี๋ยว', 'ยำ', 'ต้ม', 'ผัด', 'แกง', 'ทอด', 'สเต็ก', 'จานเดียว', 'food', 'meal', 'dish', 'noodle'];
  if (foodKeywords.some(kw => cat.includes(kw))) {
    return [...CATEGORY_PRESETS.food];
  }

  // Bakery & Desserts
  const bakeryKeywords = ['เบเกอรี่', 'เค้ก', 'ขนม', 'คุกกี้', 'ครัวซองต์', 'โทสต์', 'bakery', 'cake', 'cookie', 'bread', 'dessert'];
  if (bakeryKeywords.some(kw => cat.includes(kw))) {
    return [...CATEGORY_PRESETS.bakery];
  }

  return [...CATEGORY_PRESETS.default];
}
