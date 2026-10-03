'use client'

import {useState} from 'react'

interface RecipeResult {
  title: string
  verdict: 'safe' | 'risky'
  warning: string
  ingredientsUsed: string[]
  missing: string[]
  steps: string[]
}

export default function Home() {
  const [pantry, setPantry] = useState('')
  const [restrictions, setRestrictions] = useState('')
  const [mood, setMood] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RecipeResult | null>(null)
  const [error, setError] = useState('')

  async function consultOracle(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({pantry, restrictions, mood}),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
      } else {
        setResult(data.result)
      }
    } catch {
      setError('Could not reach the Oracle. Is the server running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-xl">
        <header className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">🔮 Fridge Oracle</h1>
          <p className="mt-2 text-sm opacity-70">
            Tell it what&apos;s in your kitchen and what you can&apos;t eat. It finds you something safe to cook.
          </p>
          <p className="mt-3 inline-block text-xs rounded-full border border-current/20 px-3 py-1 opacity-70">
            Runs on a local AI model on this computer — your allergies and what&apos;s in your fridge never leave this machine.
          </p>
        </header>

        <form onSubmit={consultOracle} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">What&apos;s in your kitchen?</span>
            <textarea
              value={pantry}
              onChange={(e) => setPantry(e.target.value)}
              required
              rows={3}
              placeholder="eggs, rice, half an onion, cheddar, tinned tomatoes..."
              className="rounded-lg border border-current/20 bg-transparent p-3 text-sm outline-none focus:border-current/50"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Allergies or restrictions (never crossed)</span>
            <input
              value={restrictions}
              onChange={(e) => setRestrictions(e.target.value)}
              placeholder="e.g. lactose intolerant, no peanuts, halal"
              className="rounded-lg border border-current/20 bg-transparent p-3 text-sm outline-none focus:border-current/50"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Mood or cuisine (optional)</span>
            <input
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              placeholder="e.g. something quick, comfort food, spicy"
              className="rounded-lg border border-current/20 bg-transparent p-3 text-sm outline-none focus:border-current/50"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-lg bg-foreground text-background font-medium py-3 text-sm disabled:opacity-50"
          >
            {loading ? 'Consulting the Oracle…' : 'Ask the Oracle'}
          </button>
        </form>

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-6 rounded-lg border border-current/20 p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-semibold">{result.title}</h2>
              <span
                className={`shrink-0 text-xs rounded-full px-2 py-1 font-medium ${
                  result.verdict === 'safe'
                    ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                    : 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400'
                }`}
              >
                {result.verdict === 'safe' ? 'Safe for your restrictions' : 'Needs a double-check'}
              </span>
            </div>

            {result.warning && (
              <p className="mt-2 text-sm opacity-80">{result.warning}</p>
            )}

            {result.ingredientsUsed.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium opacity-70">Using what you have</h3>
                <p className="text-sm mt-1">{result.ingredientsUsed.join(', ')}</p>
              </div>
            )}

            {result.missing.length > 0 && (
              <div className="mt-3">
                <h3 className="text-sm font-medium opacity-70">You might need to grab</h3>
                <p className="text-sm mt-1">{result.missing.join(', ')}</p>
              </div>
            )}

            {result.steps.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium opacity-70">Steps</h3>
                <ol className="mt-1 list-decimal list-inside text-sm space-y-1">
                  {result.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
