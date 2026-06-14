# 🌐 Orbix Frontend

Next.js 16 / React 19 application providing the interactive 3D orbital tracker, conjunction threat dashboard, and one-click catalog sync UI for Orbix.

For the project-wide pitch, architecture diagram, and "why this matters" framing, see the **[main README](../README.md)**.

---

## 📖 Table of Contents

- [Tech Stack](#%EF%B8%8F-tech-stack)
- [Project Structure](#-project-structure)
- [Setup](#setup)
- [Environment Variables](#-environment-variables)
- [Pages](#-pages)
- [Design System Notes](#-design-system-notes)
- [Known Issues / TODO](#known-issues--todo)

---

## 🛠️ Tech Stack

| Component | Technology | Purpose |
|---|---|---|
| Framework | Next.js 16 (App Router) | SSR/SSG, file-based routing |
| Language | TypeScript 5 | Type-safe React components |
| 3D Rendering | Three.js r184 + React Three Fiber | WebGL globe, instanced satellite rendering |
| 3D Utilities | @react-three/drei | `OrbitControls`, `Trail` effects, `Sphere` primitives |
| HTTP Client | Axios | Communication with the FastAPI backend |
| Styling | Tailwind CSS v4 | Utility-first design tokens (alongside inline styles for the landing page) |

---

## 📁 Project Structure

```
frontend/
├── package.json
├── logo.svg
└── app/
    ├── layout.tsx           # Root layout, metadata, global styles
    ├── globals.css          # Tailwind import + CSS variables
    ├── page.tsx             # Landing page (hero, database sync, navigation)
    ├── globe/
    │   └── page.tsx         # 3D orbital tracker (Three.js, instanced rendering)
    └── threats/
        └── page.tsx         # Threat analysis UI (Foster/Chan results, risk cards)
```

---
<a id="setup"></a>
## ⚙️ Setup

**1. Install dependencies:**

```bash
cd frontend
npm install
```

**2. Configure the backend URL** — see [Environment Variables](#-environment-variables) below.

**3. Start the development server:**

```bash
npm run dev
```

The app will be available at `http://localhost:3000`. Make sure the [backend](../backend/README.md) is running on port `8000` first (or update the URL accordingly).

**Other scripts:**

```bash
npm run build   # Production build
npm run start   # Serve the production build
npm run lint    # ESLint
```

---

## 🔐 Environment Variables

Create a `.env.local` file in `frontend/`:

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the FastAPI backend | `http://localhost:8000` |

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

This is read by `app/page.tsx` and `app/globe/page.tsx` to call `/trigger-update` and `/globe`. See [Known Issues](#-known-issues--todo) regarding the threats page.

---

## 📄 Pages

### `/` — Landing Page (`app/page.tsx`)

The entry point: an animated, glassmorphic dashboard with a starfield background. From here you can:

- Trigger a **live catalog sync** (calls `POST /trigger-update`), with inline status messages for syncing / success / error states.
- Navigate to the **Globe** and **Threats** views.

<!-- //screenshot: hero — full landing page showing the animated globe hero, glassy dashboard cards, and starfield background -->

### `/globe` — 3D Orbital Tracker (`app/globe/page.tsx`)

A real-time Three.js / React Three Fiber scene built around `GET /globe?target_norad_id={id}`:

- Renders the **entire fleet** (~50,000 objects) as a single `InstancedMesh` for performance.
- Highlights the **target satellite** distinctly, with an orbital `Trail`.
- Supports a **chase camera** mode that follows the target satellite along its trajectory.
- Adjustable simulation speed (1× real-time up to 200× fast-forward).
- Accepts a `norad_id` query parameter (via `useSearchParams`) so a target can be linked to directly, e.g. `/globe?norad_id=25544`.

<!-- //screenshot: globe view — the full 3D canvas showing white satellite cloud around the Earth sphere, with the red target satellite and its orbital trail visible -->
<!-- //screenshot: chase camera mode — camera locked behind the red target satellite, globe visible below, orbital trail stretching behind it -->

### `/threats` — Conjunction Threat Analysis (`app/threats/page.tsx`)

A search-driven dashboard around `POST /api/threats`:

- Input a NORAD ID (defaults to `25544` / ISS, or pre-fills from a `norad_id` query parameter).
- Displays a loading state while the backend runs its three-phase pipeline.
- Renders the returned threat list as glass-panel cards, each annotated with miss distance, time of closest approach (TCA), collision probability, and a **CRITICAL / HIGH / MEDIUM / LOW** risk badge.
- Surfaces backend error messages (e.g. unknown NORAD ID) inline.

<!-- //screenshot: threats page — showing the radar-sweep loading animation, then the populated threat cards with CRITICAL / HIGH / MEDIUM badges -->

---

## 🎨 Design System Notes

The UI follows a consistent "mission control" aesthetic across all three pages:

- **Dark space backgrounds** with a starfield (`radial-gradient` dot pattern) and a subtle radial glow.
- **Glassmorphic panels** — semi-transparent dark backgrounds (`rgba(15, 23, 42, 0.7)`), `backdrop-filter: blur(...)`, and thin white-alpha borders.
- **Risk-level color coding** consistent with the backend's classification: CRITICAL (red), HIGH (orange), MEDIUM (yellow), LOW (green).
- Tailwind CSS v4 (via `@tailwindcss/postcss`) is configured for utility classes, while the landing and threats pages currently lean on inline styles and `<style>` blocks for fine-grained animation control (orbiting/floating keyframes, etc.).

---
<a id="known-issues--todo"></a>
## ⚠️ Known Issues / TODO

- **`app/threats/page.tsx` currently hardcodes `API_BASE_URL = "http://127.0.0.1:8000"`** instead of reading `NEXT_PUBLIC_API_URL` like the other pages. If you deploy the backend somewhere other than `127.0.0.1:8000`, update this constant (or refactor it to use the shared env variable) before the Threats page will work.
- CORS on the backend is currently wide open (`allow_origins=["*"]`) — fine for local development, but should be restricted before any public deployment.
