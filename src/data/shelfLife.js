// Shelf-life config keyed by recipe ID (from recipes.js)
// hours: refrigerated shelf life
// hasDryKit: true = alert 24h before expiry to separate dry/wet components

export const SHELF_LIFE = {
  1:  { hours: 120, hasDryKit: false }, // רוטב קיסר — 5 ימים
  2:  { hours: 48,  hasDryKit: false }, // אורז צ'יראשי
  3:  { hours: 720, hasDryKit: false }, // חומץ לאורז — חודש
  4:  { hours: 72,  hasDryKit: false }, // קרוטונים לקיסר — 3 ימים
  5:  { hours: 48,  hasDryKit: false }, // סלט ביצים
  6:  { hours: 96,  hasDryKit: false }, // ציר ירקות — 4 ימים
  7:  { hours: 72,  hasDryKit: false }, // ציר דגים — 3 ימים
  8:  { hours: 168, hasDryKit: false }, // ויניגרט רענן — 7 ימים
  9:  { hours: 48,  hasDryKit: false }, // חלמונים בראנר
  10: { hours: 48,  hasDryKit: true  }, // רוטב חלמונים — חמאה, ערכת יבש
  11: { hours: 48,  hasDryKit: true  }, // בייס שיפוד דג — חמאה, ערכת יבש
  12: { hours: 336, hasDryKit: false }, // ריבת שרי — 14 ימים
  13: { hours: 720, hasDryKit: false }, // שום קונפי — 30 ימים בשמן
  14: { hours: 504, hasDryKit: false }, // סחוג ירוק מותסס — 21 ימים
  15: { hours: 504, hasDryKit: false }, // צ'ילי מותסס — 21 ימים
  16: { hours: 4320,hasDryKit: false }, // לימון כבוש — 6 חודשים
  17: { hours: 168, hasDryKit: false }, // מלפפונים חמוצים — 7 ימים
  18: { hours: 72,  hasDryKit: false }, // בצק פיצה — 3 ימים
  19: { hours: 72,  hasDryKit: false }, // בצק פסטה — 3 ימים
};

export const DEFAULT_SHELF_LIFE = { hours: 48, hasDryKit: false };
