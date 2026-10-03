import {NextRequest, NextResponse} from 'next/server'
import {checkSafety} from '@/lib/safety'

interface RecipeResult {
  title: string
  verdict: 'safe' | 'risky'
  warning: string
  ingredientsUsed: string[]
  missing: string[]
  steps: string[]
}

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const MODEL = process.env.OLLAMA_MODEL || 'gemma3:4b'

async function askOracle(params: {pantry: string; restrictions: string; mood: string}): Promise<RecipeResult> {
  const {pantry, restrictions, mood} = params

  const systemPrompt = `You are the Fridge Oracle, a careful home-cooking assistant. You suggest ONE recipe using mostly what the person already has, and you NEVER suggest anything that conflicts with their stated allergies or dietary restrictions — that is the single most important rule.

Respond with ONLY a JSON object, no markdown fences, matching this exact shape:
{"title": "recipe name", "verdict": "safe" | "risky", "warning": "empty string if fully safe, otherwise a short clear note about what to double check or swap", "ingredientsUsed": ["..."], "missing": ["one or two things they'd need to buy, or empty array"], "steps": ["step 1", "step 2", "..."]}

Set "verdict" to "risky" only if you cannot fully avoid their restrictions with what's available, and explain why in "warning". Keep steps short and practical, 4-7 steps.`

  const userPrompt = `What's in the kitchen: ${pantry}

Allergies / restrictions (never violate these): ${restrictions || 'none stated'}

Mood / cuisine preference: ${mood || 'no preference, surprise me'}

Suggest one recipe.`

  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      format: 'json',
      options: {temperature: 0.8},
      messages: [
        {role: 'system', content: systemPrompt},
        {role: 'user', content: userPrompt},
      ],
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Ollama request failed: ${res.status} ${text}`)
  }

  const data = await res.json()
  const raw: string = data.message?.content ?? '{}'
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw)

  return {
    title: parsed.title || 'Mystery Dish',
    verdict: parsed.verdict === 'risky' ? 'risky' : 'safe',
    warning: cleanText(parsed.warning),
    ingredientsUsed: cleanList(parsed.ingredientsUsed),
    missing: cleanList(parsed.missing),
    steps: cleanList(parsed.steps),
  }
}

// gemma3:4b sometimes parrots the prompt's own placeholder wording back
// ("empty string", "empty array") instead of actually leaving a field empty.
const PLACEHOLDER = /^(empty|none|n\/a|null)[\s.]*(string|array)?$/i

function cleanText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return PLACEHOLDER.test(value.trim()) ? '' : value
}

function cleanList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item) => typeof item === 'string' && !PLACEHOLDER.test(item.trim()))
}

export async function POST(req: NextRequest) {
  try {
    const {pantry, restrictions, mood} = await req.json()

    if (!pantry || typeof pantry !== 'string' || !pantry.trim()) {
      return NextResponse.json({error: 'Tell the Oracle what is in your kitchen first.'}, {status: 400})
    }

    const result = await askOracle({pantry, restrictions: restrictions || '', mood: mood || ''})

    // The model's own "safe" verdict isn't reliable enough on its own for
    // something allergy-critical — double-check it against a plain keyword list.
    const safety = checkSafety(restrictions || '', result.ingredientsUsed, result.steps)
    if (safety.conflicts.length > 0) {
      result.verdict = 'risky'
      result.warning = `Double-checked against your restrictions: this recipe ${safety.conflicts.join('; ')}. Swap or drop that ingredient before cooking.`
    }

    return NextResponse.json({result})
  } catch (err) {
    console.error(err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    const hint = message.includes('fetch failed') || message.includes('ECONNREFUSED')
      ? 'Could not reach the local Ollama server. Run "ollama serve" and make sure the model is pulled.'
      : message
    return NextResponse.json({error: hint}, {status: 500})
  }
}
