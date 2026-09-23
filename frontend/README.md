# ReturnReady Frontend

React + TypeScript workspace for owners and tenants. Start the API in `backend` before this app.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

`.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

App: [http://localhost:5173](http://localhost:5173)

`npm run build` typechecks and builds for production. `npm run preview` serves that build.

## Auth

- Owners register at `/register/owner`.
- Login at `/login`. The role comes from the API, not the form.
- Tenants activate only at `/invite/:token`.
- The access token is kept in `sessionStorage`. Refresh uses an HTTP-only cookie, so API calls send credentials.

Owners land on `/owner/dashboard`. Tenants land on `/tenant/dashboard`. A completed tenancy stays available to that tenant as read-only history.

## Workspace

Owners manage properties, tenancies, inspections, property changes, settlement, and reports.

Tenants see their rental, property change requests, inspections, settlement, and completed handover reports.
