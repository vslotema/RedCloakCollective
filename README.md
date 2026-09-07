# RedCloak Collective

A Medium-style blogging platform for special needs caregivers and special needs people to share their stories.

## Stack

- **public-web/** — Nuxt 4 (Vue 3, Vuetify 3, Pinia, Axios, TipTap). One app for everything: SSR'd public pages (articles, equipment lists, profiles, explore) for SEO/sharing, plain client-rendered pages (feed, editor, settings) for the authenticated app.
- **backend/** — Laravel API (Sanctum: bearer tokens for the app, a session cookie alongside it purely so Nuxt's SSR can identify the viewer).

## Getting started

Run both apps together from the repo root (one-time setup: `npm install` at the root — this installs `public-web`'s dependencies too, via npm workspaces):

```bash
npm run dev
```

This starts the Laravel API on `:8000` and the Nuxt dev server on `:3000` in one terminal, with
labeled/color-coded output. Or run each separately:

### Backend

```bash
cd backend
composer install
cp .env.example .env   # already done for local dev
php artisan key:generate
php artisan migrate
php artisan serve --port=8000
```

API available at `http://127.0.0.1:8000/api` (health check: `GET /api/health`).

### Frontend

```bash
npm run dev --workspace public-web -- --port 3000
```

App available at `http://localhost:3000`. Server-side fetches (SSR) hit the API directly via
`NUXT_API_BASE` (defaults to `http://127.0.0.1:8000/api`); the browser talks to `/api`, same-origin.

### CORS

`backend/config/cors.php` allows the origins set in `CORS_ALLOWED_ORIGINS` (defaults to
`http://localhost:3000`, matching the Nuxt dev server), with `supports_credentials` enabled for
the session cookie.

## Accessible editor (`/write`)

`/write` is being rebuilt in phases into an accessible, voice-first editor (large native controls,
strong focus/status feedback, eventually switch/gaze/speech input). With the app running, log in
and visit `http://localhost:3000/write`.

Current phase (structure only): a three-area layout — a tool sidebar, the document editor, and a
live status/feedback panel — built with native HTML controls and the same design tokens as the
rest of the app (`public-web/assets/styles/style.scss`, `public-web/theme/index.ts`), extended with
new accessibility tokens (`--control-min-size*`, `--focus-ring-*`). The editor body is a plain-text
placeholder for now — rich text (TipTap), real formatting commands, and publishing return in a
later phase.
