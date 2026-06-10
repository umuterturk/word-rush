# Word Rush

A fast, mobile-first arcade word game where you tap falling letters to spell **Turkish words** against the clock.

**[Play Now](https://umuterturk.github.io/word-rush/)**

## How to Play

- Letters fall into a 7×11 grid arena
- A target word is shown at the top — tap letters in order to spell it
- Spell the target word and it auto-submits, scoring points and clearing tiles
- Longer words are worth more points (3 letters = 1 pt up to 8 letters = 16 pts)
- Tap a selected letter to deselect it, or hit **CLEAR** to start over
- You have 2 minutes to score as many points as possible

## Features

- Mobile-first, touch-optimized UI
- Turkish word list with length-based scoring
- **1v1 multiplayer** — quick match or private room codes
- Live opponent score for competitive adrenaline
- Firebase Analytics (GA4) event tracking
- No scrolling, fits any phone screen
- Deterministic seeded letter generation (shared arena in multiplayer)

## Tech Stack

- React + TypeScript + Vite
- Firebase (Firestore, Anonymous Auth, Analytics)
- Pure domain core with ports/adapters architecture
- No external game frameworks

## Development

```bash
npm install
npm run dev     # Start dev server
npx vitest      # Run tests
npm run build   # Production build
```

Copy `.env.example` to `.env` and fill in your Firebase config to enable multiplayer and analytics locally.

## Firebase Setup

1. Create a [Firebase project](https://console.firebase.google.com/)
2. Enable **Firestore** (production mode)
3. Enable **Anonymous Authentication** (Authentication → Sign-in method)
4. Enable **Google Analytics** (GA4) when creating the project
5. Register a **Web app** and copy the config values into `.env`
6. Deploy security rules and indexes:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

Or manually paste [`firestore.rules`](firestore.rules) into the Firebase console.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Web app ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | GA4 measurement ID |
| `VITE_FIREBASE_MATCHES_COLLECTION` | Firestore collection for matches (default `word-rush-matches`) |

Without these env vars, the game runs in **solo-only** mode (multiplayer buttons are hidden).

## Multiplayer Architecture

Game logic runs entirely on each client. Firestore only carries:

- **Match config** — shared `seed` and `matchDuration` so both players see the same falling letters
- **Live scores** — each client writes its own score; opponent score is read via `onSnapshot`

This fork shares the same Firebase project as Sum Rush but uses a **separate
Firestore collection** (`word-rush-matches`, configurable via
`VITE_FIREBASE_MATCHES_COLLECTION`) so the two games never cross-match.

```
word-rush-matches/{matchId}
  mode: 'quick' | 'private'
  inviteCode: string | null
  status: 'waiting' | 'ready' | 'ended'
  seed: string
  matchDuration: number
  players: { [uid]: { name, score, joinedAt } }
```

Matchmaking options:
- **Quick Match** — auto-pairs with another waiting player
- **Create Room** — generates a 6-character invite code
- **Join Room** — enter a friend's code

## Analytics Events

| Event | When |
|-------|------|
| `app_open` | App loads |
| `mode_selected` | Solo / quick / create / join chosen |
| `mp_search_started` | Quick match search begins |
| `mp_room_created` | Private room created |
| `mp_room_joined` | Joined a private room |
| `match_started` | Countdown complete, game begins |
| `point_scored` | Player scores a point (multiplayer) |
| `match_ended` | Match time expires |

## Architecture

The game uses IoC/ports-and-adapters to keep the domain pure:

```
src/
  domain/     # Pure game logic (no React, no DOM, no timers)
  ports/      # Interfaces for external systems
  adapters/   # Browser / Firebase implementations
  app/        # React UI layer
  firebase/   # Firebase initialization
  multiplayer/# Match types
```

## License

MIT
