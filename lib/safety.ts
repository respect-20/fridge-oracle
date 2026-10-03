// A small local model can say "safe" and still hand back butter to someone
// who said they're lactose intolerant — tested and confirmed on gemma3:4b.
// This is a deterministic second check that runs after the model, so a
// restriction is never trusted to the model's judgment alone.

interface RestrictionRule {
  matches: string[] // phrases in the user's restriction text that trigger this rule
  conflicts: string[] // ingredient words that violate it
  label: string // shown in the warning
}

const RULES: RestrictionRule[] = [
  {
    matches: ['lactose', 'dairy', 'milk allergy', 'no milk', 'dairy-free', 'dairy free'],
    conflicts: ['milk', 'cheese', 'cheddar', 'mozzarella', 'parmesan', 'butter', 'cream', 'yogurt', 'yoghurt', 'ghee', 'whey', 'custard', 'ice cream'],
    label: 'dairy',
  },
  {
    matches: ['gluten', 'celiac', 'coeliac', 'no wheat', 'wheat-free', 'wheat free'],
    conflicts: ['flour', 'bread', 'pasta', 'noodle', 'barley', 'rye', 'couscous', 'breadcrumb', 'beer'],
    label: 'gluten',
  },
  {
    matches: ['peanut', 'tree nut', 'nut allerg', 'no nuts', 'nut-free', 'nut free'],
    conflicts: ['peanut', 'almond', 'cashew', 'walnut', 'pecan', 'hazelnut', 'pistachio', 'macadamia', 'nutella'],
    label: 'nuts',
  },
  {
    matches: ['egg allerg', 'no eggs', 'egg-free', 'egg free'],
    conflicts: ['egg', 'mayonnaise', 'mayo'],
    label: 'eggs',
  },
  {
    matches: ['shellfish', 'crustacean'],
    conflicts: ['shrimp', 'prawn', 'crab', 'lobster', 'mussel', 'clam', 'oyster', 'scallop'],
    label: 'shellfish',
  },
  {
    matches: ['soy allerg', 'no soy', 'soy-free', 'soy free'],
    conflicts: ['soy', 'soya', 'tofu', 'edamame', 'tempeh'],
    label: 'soy',
  },
  {
    matches: ['vegan'],
    conflicts: ['meat', 'chicken', 'beef', 'pork', 'bacon', 'ham', 'fish', 'shrimp', 'egg', 'milk', 'cheese', 'butter', 'cream', 'honey', 'gelatin'],
    label: 'animal products',
  },
  {
    matches: ['vegetarian'],
    conflicts: ['meat', 'chicken', 'beef', 'pork', 'bacon', 'ham', 'fish', 'shrimp', 'prawn', 'gelatin'],
    label: 'meat or fish',
  },
  {
    matches: ['halal'],
    conflicts: ['pork', 'bacon', 'ham', 'wine', 'beer', 'alcohol'],
    label: 'non-halal ingredients',
  },
]

export interface SafetyCheck {
  conflicts: string[] // human-readable notes, one per violation found
}

export function checkSafety(restrictions: string, ingredientsUsed: string[], steps: string[]): SafetyCheck {
  const restrictionText = restrictions.toLowerCase()
  const haystack = [...ingredientsUsed, ...steps].join(' ').toLowerCase()

  const conflicts: string[] = []

  for (const rule of RULES) {
    const applies = rule.matches.some((phrase) => restrictionText.includes(phrase))
    if (!applies) continue

    for (const word of rule.conflicts) {
      if (haystack.includes(word)) {
        conflicts.push(`contains ${word}, which conflicts with "${rule.label}"`)
      }
    }
  }

  return {conflicts}
}
