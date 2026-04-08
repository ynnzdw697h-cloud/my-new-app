// Main Dish (Assembly) Recipes
// Each dish links to Sub-Recipes by recipeId (from recipes.js)
// costPerPortion: manually maintained until OCR-driven live cost is built (Phase 2)

export const MAIN_DISHES = [
  {
    id: 'dish_caesar',
    name: 'סלט קיסר',
    category: 'סלטים',
    station: 'cold',
    sellingPrice: 68,
    defaultPortions: 1,
    prepTimeMin: 10,
    allergens: ['דגים', 'ביצים', 'חלב', 'גלוטן'],
    description: 'סלט קיסר קלאסי עם טוויל פרמז׳ן וקרוטונים ביתיים — רוטב ביתי עם אנשובי ספרדי',

    directIngredients: [
      { name: 'חסה רומן',      qty: 180, unit: 'גרם' },
      { name: 'פרמז׳ן מגורד', qty: 20,  unit: 'גרם' },
      { name: 'מיץ לימון',    qty: 10,  unit: 'מ"ל' },
    ],

    subRecipes: [
      { recipeId: 1, name: 'רוטב קיסר',      portionsUsed: 1, portionDesc: '60 גרם' },
      { recipeId: 4, name: 'קרוטונים לקיסר', portionsUsed: 1, portionDesc: '30 גרם' },
    ],

    costPerPortion: 12.50,

    method: [
      'קרעו עלי חסה רומן לחתיכות גסות, שטפו ויבשו היטב.',
      'ערבבו עם רוטב קיסר — 60 גרם למנה, ציפוי אחיד על כל העלים.',
      'הניחו בצלחת, פזרו קרוטונים וטוויל פרמז׳ן מעל.',
      'סיימו עם מיץ לימון טרי וגרידת פרמז׳ן דקה.',
    ],

    foh: {
      sellingPoints: [
        'רוטב קיסר ביתי עם אנשובי ספרדי — מוכן כל יום',
        'טוויל פרמז׳ן פריך — נאפה טרי כל משמרת',
        'ניתן להוסיף פרגית צלויה / שרימפס טריים',
      ],
      pairing: 'שרדונה צעיר, רוזה יבש',
      serveTemp: 'קר — להגיש מיד לאחר ערבוב',
      platingNote: 'רוטב בצלחת לפני החסה. הטוויל מונח אחרון, עמידה אנכית.',
    },
  },

  {
    id: 'dish_fish_skewer',
    name: 'שיפוד דג וילה',
    category: 'עיקריות',
    station: 'hot',
    sellingPrice: 145,
    defaultPortions: 1,
    prepTimeMin: 18,
    allergens: ['דגים', 'חלב'],
    description: 'שיפוד דג ים טרי עם בסיס חמאה חומה, ציר דגים עמוק וסחוג ירוק מותסס',

    directIngredients: [
      { name: 'פרוסות דג ים טרי', qty: 200, unit: 'גרם' },
      { name: 'שמן זית',           qty: 15,  unit: 'מ"ל' },
      { name: 'מלח גס',            qty: 3,   unit: 'גרם' },
      { name: 'מיקרו עשבים',       qty: 5,   unit: 'גרם' },
    ],

    subRecipes: [
      { recipeId: 11, name: 'בייס שיפוד דג',     portionsUsed: 1,   portionDesc: '80 גרם' },
      { recipeId: 7,  name: 'ציר דגים',           portionsUsed: 0.5, portionDesc: '100 מ"ל' },
      { recipeId: 14, name: 'סחוג ירוק מותסס',   portionsUsed: 1,   portionDesc: '15 גרם' },
    ],

    costPerPortion: 38.00,

    method: [
      'חלפו פרוסות דג עם שמן זית ומלח גס — נגיעה קלה, לא להשרות.',
      'צלו על גריל/פלנצ\'ה 2 דקות כל צד על חום גבוה מאוד — לא להזיז בין לבין.',
      'חממו בייס שיפוד דג בסיר קטן, הוסיפו ציר דגים לדילול לסמיכות רוטב.',
      'הניחו שיפוד על צלחת חמה, שפכו בסיס מסביב — לא מעל הדג.',
      'סיימו עם כף סחוג ירוק בצד שמאל ופיזור מיקרו עשבים.',
    ],

    foh: {
      sellingPoints: [
        'דג ים שנרכש הבוקר מהנמל — לא מוקפא',
        'בסיס חמאה חומה צרפתי עם ציר דגים עמוק',
        'סחוג ירוק מותסס — 3 שבועות תסיסה, חריפות עדינה',
      ],
      pairing: 'שרדונה בורגוני, ורמנטינו סרדיני',
      serveTemp: 'חם — 65°C, להגיש תוך 90 שניות מהצלייה',
      platingNote: 'הבסיס נשפך סביב הדג, לא מעליו. הסחוג בצד שמאל, פס דק.',
    },
  },

  {
    id: 'dish_chirashi',
    name: "צ'יראשי",
    category: 'עיקריות',
    station: 'cold',
    sellingPrice: 118,
    defaultPortions: 1,
    prepTimeMin: 12,
    allergens: ['דגים', 'סויה', 'שומשום'],
    description: "קערת צ'יראשי עם אורז מתובל לפי טכניקה יפנית, דגי טעם טריים וויניגרט רענן",

    directIngredients: [
      { name: 'דג טרי לפרוסות (סלמון / טונה / בר)', qty: 120, unit: 'גרם' },
      { name: 'אבוקדו',      qty: 60, unit: 'גרם' },
      { name: 'מיקרו עשבים', qty: 5,  unit: 'גרם' },
      { name: 'שומשום קלוי', qty: 5,  unit: 'גרם' },
    ],

    subRecipes: [
      { recipeId: 2, name: "אורז צ'יראשי", portionsUsed: 1, portionDesc: '150 גרם' },
      { recipeId: 8, name: 'ויניגרט רענן', portionsUsed: 1, portionDesc: '30 מ"ל' },
    ],

    costPerPortion: 28.50,

    method: [
      "הניחו 150 גרם אורז צ'יראשי חמים בקערה עגולה, שטחו בעדינות.",
      'חתכו דג טרי לפרוסות 5 מ"מ — זווית 45°.',
      'סדרו פרוסות דג מסביב לאורז, חפיפה קלה, כיוון שמש.',
      'הניחו פרוסות אבוקדו בין פרוסות הדג.',
      'טפטפו ויניגרט רענן מסביב בלבד — לא על הדג.',
      'סיימו עם מיקרו עשבים במרכז ופיזור שומשום קלוי.',
    ],

    foh: {
      sellingPoints: [
        "אורז מתובל לפי טכניקה יפנית מסורתית — חומץ, סוכר, קומבו",
        'דג טרי — נחתך לפי הזמנה, לא מוכן מראש',
        'ויניגרט עם ספירולינה ומיץ תפוח טרי',
      ],
      pairing: 'Sake יבש, רוזה פרובנסאל',
      serveTemp: 'אורז חמים, דג קר — ניגוד טמפרטורות מכוון',
      platingNote: 'הדג מסודר כשמש מסביב לאורז. גובה אחיד. מיקרו עשבים במרכז בלבד.',
    },
  },
];

export const DISH_CATEGORIES = ['הכל', 'סלטים', 'עיקריות', 'קינוחים'];
