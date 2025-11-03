import React from "react";

export const LESSONS_BACKUP: Record<
  string,
  {
    title: string;
    overview: string;
    sections: { heading: string; body: string }[];
    quiz: { question: string; options: string[]; correctIndex: number }[];
    notes?: string[];
    shortLabel?: string;
  }
> = {
  // 1: Nutrition Basics
  "1": {
    title: "Nutrition Basics",
    overview:
      "Core ideas about macronutrients, micronutrients, and practical tips to build balanced meals you can keep doing.",
    sections: [
      {
        heading: "Macronutrients",
        body: "Protein for repair and satiety, carbohydrates for energy (choose fibre-rich carbs), and fats for cell health and hormones.",
      },
      {
        heading: "Balanced plates",
        body: "Aim to include a protein, vegetables, and a wholegrain or starchy vegetable at most meals — portion sizes depend on your needs.",
      },
    ],
    quiz: [
      { question: "Which macronutrient primarily repairs tissue?", options: ["Protein", "Carbohydrate", "Fat", "Fibre"], correctIndex: 0 },
      { question: "Which choice is a fibre-rich carbohydrate?", options: ["Brown rice", "Soda", "White bread", "Candy"], correctIndex: 0 },
      { question: "Why include vegetables on your plate?", options: ["For vitamins, fibre and variety", "Because they're expensive", "To add sugar", "To increase calories"], correctIndex: 0 },
    ],
    notes: ["Small, repeatable changes matter more than perfect meals."],
    shortLabel: "Nutrition",
  },

  // 2: Reading Labels
  "2": {
    title: "Reading Labels",
    overview:
      "How to scan nutrition labels and ingredient lists quickly so you can pick healthier products in the supermarket.",
    sections: [
      { heading: "Start with serving size", body: "Serving size affects all numbers — check it first and compare to how much you actually eat." },
      { heading: "Ingredient order & nutrients", body: "Ingredients are listed by weight (largest first). Watch for added sugars, saturated fat, and sodium." },
    ],
    quiz: [
      { question: "What should you check first on a nutrition label?", options: ["Serving size", "Calories per pack", "Brand name", "Best before date"], correctIndex: 0 },
      { question: "Where do you find added sugar on many labels?", options: ["Ingredient list and 'added sugars' field", "Front picture", "Price tag", "Manufacturer name"], correctIndex: 0 },
      { question: "If sugar is listed first in ingredients, that means:", options: ["It’s one of the main ingredients", "It’s not in the product", "It’s only trace amount", "It’s organic"], correctIndex: 0 },
    ],
    notes: ["Use label checks to compare similar products quickly."],
    shortLabel: "Labels",
  },

  // 3: Food Safety
  "3": {
    title: "Food Safety",
    overview:
      "Key steps to keep food safe at home: safe cooking temperatures, storage, and preventing cross-contamination.",
    sections: [
      { heading: "Temperature & cooking", body: "Cook meats to their safe internal temperatures and reheat leftovers until steaming hot." },
      { heading: "Storage & hygiene", body: "Chill perishable foods promptly, avoid cross-contamination (separate raw and ready-to-eat), and wash hands and surfaces." },
    ],
    quiz: [
      { question: "What helps prevent cross-contamination?", options: ["Use separate boards for raw meat and veg", "Use the same knife for everything", "Store raw meat above salads", "Skip handwashing"], correctIndex: 0 },
      { question: "Where should perishable food be stored?", options: ["In the fridge at ≤4°C / 40°F", "On the counter", "In the car", "Next to the heater"], correctIndex: 0 },
      { question: "Safe practice for leftovers is to:", options: ["Cool quickly and refrigerate within 2 hours", "Leave at room temp overnight", "Freeze immediately without cooling", "Reheat once then leave out"], correctIndex: 0 },
    ],
    notes: ["When in doubt, heat thoroughly or discard questionable items."],
    shortLabel: "Safety",
  },

  // 4: Budgeting
  "4": {
    title: "Budgeting for Food",
    overview:
      "Practical ways to eat well while spending less: planning, smart shopping, and reducing waste.",
    sections: [
      { heading: "Plan & batch", body: "Plan a week, batch-cook staples (grains, beans, roasted veg) and reuse components across meals." },
      { heading: "Shop smart", body: "Buy seasonal produce, compare unit prices, and prefer whole foods over heavily processed convenience items." },
    ],
    quiz: [
      { question: "A good budget tip is to:", options: ["Plan meals and batch-cook components", "Buy only branded snacks", "Cook every meal from scratch with expensive ingredients", "Discard leftovers"], correctIndex: 0 },
      { question: "Which saves money per serving?", options: ["Cook larger batches and reuse", "Buy many single-serve convenience items", "Throw out imperfect veg", "Only buy imported produce"], correctIndex: 0 },
      { question: "To reduce waste you should:", options: ["Use leftovers creatively", "Ignore expiry dates", "Buy more perishable items than you can eat", "Always buy single-use packaging"], correctIndex: 0 },
    ],
    notes: ["Small planning steps compound into big savings."],
    shortLabel: "Budget",
  },

  // 5: Misleading Claims
  "5": {
    title: "Misleading Claims",
    overview:
      "Common marketing phrases and how to interpret them — 'natural', 'low-fat', and front-of-pack claims may not mean 'healthy'.",
    sections: [
      { heading: "Watch the front label", body: "Claims on the front of pack are marketing — check the full nutrition facts and ingredient list for the truth." },
      { heading: "Common traps", body: "'Low-fat' can mean high sugar; 'natural' is unregulated in many places; 'light' may not be lower in calories." },
    ],
    quiz: [
      { question: "If a product says 'low-fat' you should:", options: ["Check sugar and calories on the nutrition panel", "Assume it's the healthiest option", "Buy extra", "Trust the picture"], correctIndex: 0 },
      { question: "A 'natural' claim on the front of pack means:", options: ["Not necessarily regulated, check ingredients", "It is always organic", "It has no sugar", "It is calorie-free"], correctIndex: 0 },
      { question: "Best approach to marketing claims is to:", options: ["Verify with the ingredient list and nutrition facts", "Believe the claim without checking", "Ignore labels completely", "Buy the cheapest item"], correctIndex: 0 },
    ],
    notes: ["Use facts (ingredients + numbers) not marketing language to compare products."],
    shortLabel: "Claims",
  },

  // 6: Labeling Rules
  "6": {
    title: "Labeling Rules",
    overview:
      "Basics of how ingredient lists, allergen statements, and nutrition panels are organised — and what to check for safety and accuracy.",
    sections: [
      { heading: "Ingredient order & allergens", body: "Ingredients are listed by weight — allergens are often highlighted or in a separate 'contains' statement." },
      { heading: "Nutrition panel basics", body: "Panels show per-serving amounts (and sometimes per package). Look for calories, sugars, fat, sodium and protein." },
    ],
    quiz: [
      { question: "Ingredients are listed in what order?", options: ["By weight (largest to smallest)", "Alphabetical order", "By price", "Random order"], correctIndex: 0 },
      { question: "An allergen 'contains' statement means:", options: ["It intentionally includes that allergen", "It never includes allergens", "It is marketed as allergen-free", "It is always organic"], correctIndex: 0 },
      { question: "Nutrition facts usually list values:", options: ["Per serving (and sometimes per package)", "Only per 100g always", "In teaspoons only", "Only as percentages"], correctIndex: 0 },
    ],
    notes: ["Allergen notices and serving columns are important for safety and comparison."],
    shortLabel: "Rules",
  },

  // 7: Serving Sizes
  "7": {
    title: "Serving Sizes",
    overview:
      "Understanding serving sizes helps you interpret nutrition numbers correctly — packages can contain multiple servings.",
    sections: [
      { heading: "Serving vs package", body: "A package may contain several servings; multiply the per-serving numbers to match how much you eat." },
      { heading: "Measuring & eyeballing", body: "Use simple measures (cups, handfuls) to estimate servings until you're comfortable with portion sizes." },
    ],
    quiz: [
      { question: "If a pack lists 2 servings and you eat the whole pack, you should:", options: ["Double the per-serving calories to get total", "Use the per-serving number as-is", "Ignore the label", "Assume it's one serving"], correctIndex: 0 },
      { question: "Serving size affects:", options: ["All nutrition numbers on the panel", "Only the brand name", "Only the picture", "Only the ingredients order"], correctIndex: 0 },
      { question: "A practical way to estimate a serving is to use:", options: ["A handful, a cup measure or a kitchen scale", "Only your phone", "The front picture", "The color of the food"], correctIndex: 0 },
    ],
    notes: ["Check serving size first — it's the key to accurate comparisons."],
    shortLabel: "Portions",
  },

  // 8: Sugar and Sweeteners
  "8": {
    title: "Sugar & Sweeteners",
    overview:
      "Types of sugars and sweeteners, how to spot added sugars on labels, and healthier swap ideas.",
    sections: [
      { heading: "Added vs natural sugars", body: "Natural sugars (in fruit, milk) come with nutrients; added sugars increase calories without benefits." },
      { heading: "Types of sweeteners", body: "Learn common names (sucrose, high-fructose corn syrup, dextrose) and non-nutritive sweeteners — check ingredient lists and 'added sugars' fields." },
    ],
    quiz: [
      { question: "Which sugar is generally packaged with fibre and nutrients?", options: ["Whole fruit", "Soda", "Table sugar", "Candy"], correctIndex: 0 },
      { question: "To find added sugar on a label, check:", options: ["Ingredient list and 'added sugars' on nutrition panel", "The front image", "Unit price", "Manufacturer address"], correctIndex: 0 },
      { question: "A good swap to reduce added sugar is:", options: ["Choose plain yoghurt and add fruit", "Drink extra soda", "Add sugar to breakfast", "Eat more syrup"], correctIndex: 0 },
    ],
    notes: ["When reducing sugar, prefer whole foods and simple swaps rather than processed 'diet' options."],
    shortLabel: "Sugar",
  },
};

export default function LessonBackups() {
  // This component exists only so the file can be imported as a React module.
  // The app should import LESSONS_BACKUP and not render this component.
  return null;
}
