# VectorPong

A modern vector-based Pong game built with **Phaser 4** and **TypeScript**.

## Game Modes

- **Standard** — Classic retro pong with green-on-black CRT aesthetics, scanline overlay, and chiptune sounds. 1v1.
- **Modern** — Neon vector visuals with bloom/glow filters, particle trails, and 7 power-ups. 1v1.
- **Multiplayer** — Up to 4 players, one paddle per screen edge, free-for-all with power-ups.

## Power-Ups (Modern & Multiplayer)

- **Multiball (×10)** — Spawns 9 extra balls for 6 seconds
- **Slow Opponent** — Halves opponent speed for 8s
- **Speed Boost** — Doubles your paddle speed for 8s
- **Big Paddle** — Increases your paddle 50% for 10s
- **Shrink Opponent** — Shrinks opponent paddle 50% for 10s
- **Fireball** — Ball passes through opponent paddle once
- **Shield** — Temporary wall behind your paddle for 10s

## Controls

- **Player 1**: W / S
- **Player 2**: ↑ / ↓
- **Player 3**: I / K
- **Player 4**: Numpad 8 / 5
- **Gamepad**: Left stick / D-pad (auto-detected per player slot)
- **Mobile**: Touch zones (left/right halves for 2P, quadrants for 4P)

## Setup

```bash
npm install
npm run dev      # Start dev server at localhost:8080
npm run build    # Production build to dist/
```

## Supabase (High Scores)

1. Create a Supabase project
2. Run the SQL from the plan to create `vctpng_scores` table with RLS policies
3. Copy `.env.example` to `.env.local` and fill in your credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The game works fully without Supabase — the leaderboard simply won't appear.

## Deploy to Netlify

The included `netlify.toml` handles everything. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables in the Netlify dashboard.

## Tech Stack

- **Phaser 4** (RC7) — Game framework with Arcade Physics, Filters (Glow, Bloom, Vignette), Particles
- **Vite** — Build tool with hot reload
- **TypeScript** — Type safety
- **Supabase** — PostgreSQL leaderboard (optional)
- **Netlify** — Static hosting
- **Web Audio API** — Procedural sound effects (no audio files needed)
