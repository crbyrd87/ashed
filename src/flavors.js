// The app's one flavour vocabulary.
//
// 7-C: CheckIn.js defined 18 tags while Recommendations.js defined its own
// list of 14, missing Wood, Hay, Grass and Mineral. A user could tag a
// check-in with a flavour the recommendation survey would not let them ask
// for, and the AI prompt on each side described a different palate. Both now
// import from here.

// Plain names. These are what go into AI prompts, what is stored, and what
// the check-in picker renders. There used to be a second, emoji-prefixed
// copy of this list purely so the picker could show a glyph; the name then
// had to be parsed back out of the label with split(" ").slice(1) on every
// render. The tags are chips of text and need no icon.
export const FLAVOR_TAG_NAMES = [
  "Cedar", "Leather", "Earth", "Coffee", "Chocolate", "Pepper",
  "Cream", "Nuts", "Caramel", "Citrus", "Floral", "Spice",
  "Wood", "Hay", "Sweetness", "Tobacco", "Grass", "Mineral"
];
