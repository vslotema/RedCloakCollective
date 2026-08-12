# RedCloak Collective

A Medium-style blogging platform for special needs caregivers and special needs people to share their stories.

## Stack

- **frontend/** — Vue 3 + TypeScript + Vite, Vuetify 3, Vue Router, Pinia, Axios, TipTap
- **backend/** — Laravel API (Sanctum token auth)

## Getting started

Run both apps together from the repo root (one-time setup: `npm install` at the root to pull in `concurrently`):

```bash
npm run dev
```

This starts the Laravel API on `:8000` and the Vite dev server on `:5173` in one terminal, with
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
cd frontend
npm install
npm run dev -- --port=5173
```

App available at `http://localhost:5173`. Configure the API URL in `frontend/.env` via `VITE_API_BASE_URL`
(defaults to `http://127.0.0.1:8000/api`).

### CORS

`backend/config/cors.php` allows the origin set in `CORS_ALLOWED_ORIGINS` (defaults to
`http://localhost:5173`, matching the frontend dev server).
