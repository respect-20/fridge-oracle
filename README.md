# Fridge Oracle

Built for Hacktoberfest's "Build for a Friend" challenge.

Tell it what's in your kitchen and what you can't eat — allergies, intolerances, anything — and it suggests one recipe you can actually make, while making sure it never crosses your restrictions.

## Why it's local-only

This is built around an open-weight model (Google's Gemma 3, 4B) running entirely on your own computer through [Ollama](https://ollama.com). Nothing about your pantry or your health information is sent to any server:

- **Private.** Allergies and medical restrictions never leave your machine.
- **Free.** No API key, no per-request cost, no rate limit.
- **Works offline.** Once the model is downloaded, no internet connection is needed.

## Running it

1. Install [Ollama](https://ollama.com/download) and pull the model:
   ```bash
   ollama pull gemma3:4b
   ```
2. Make sure Ollama is running (`ollama serve`, or just open the app).
3. Install dependencies and start the dev server:
   ```bash
   npm install
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000).

## How it works

- `app/page.tsx` — the form: what's in your kitchen, your restrictions, your mood.
- `app/api/suggest/route.ts` — sends that to a locally running Gemma 3 model over Ollama's HTTP API (`http://localhost:11434`), asks for one recipe as structured JSON, and flags anything it can't fully guarantee is safe for your restrictions as "needs a double-check" rather than guessing.
