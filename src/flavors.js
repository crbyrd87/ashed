// The app's one flavour vocabulary.
//
// 7-C: CheckIn.js defined 18 tags while Recommendations.js defined its own
// list of 14, missing Wood, Hay, Grass and Mineral. A user could tag a
// check-in with a flavour the recommendation survey would not let them ask
// for, and the AI prompt on each side described a different palate. Both now
// import from here.

// Plain names. These are what go into AI prompts and what is stored.
export const FLAVOR_TAG_NAMES = [
  "Cedar", "Leather", "Earth", "Coffee", "Chocolate", "Pepper",
  "Cream", "Nuts", "Caramel", "Citrus", "Floral", "Spice",
  "Wood", "Hay", "Sweetness", "Tobacco", "Grass", "Mineral"
];

// The same list with the emoji used by the check-in picker, in the same order,
// so the two can be zipped by index.
export const FLAVOR_TAGS = [
  "🌲 Cedar", "🤎 Leather", "🌍 Earth", "☕ Coffee", "🍫 Chocolate", "🌶️ Pepper",
  "🥛 Cream", "🥜 Nuts", "🍯 Caramel", "🍋 Citrus", "🌸 Floral", "✨ Spice",
  "🪵 Wood", "🌾 Hay", "🍬 Sweetness", "🍂 Tobacco", "🌿 Grass", "🪨 Mineral"
];
