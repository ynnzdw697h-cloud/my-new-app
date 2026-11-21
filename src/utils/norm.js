// Text matching used by search and by the checklist's recipe links:
// "צ'יראשי" = "צ׳יראשי" = "ציראשי": ignore geresh/quote marks, spaces and dashes.
// Final letters count as regular ones, so "קיצוץ" also finds "קיצוצי".
const FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };

export const norm = s => String(s || '')
  .replace(/[׳'"״`\s\-–—־.,]/g, '')
  .replace(/[ךםןףץ]/g, c => FINALS[c])
  .toLowerCase();
