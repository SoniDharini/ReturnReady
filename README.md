# ReturnReady

Owner–tenant rental handover app. Owners invite a tenant, record move-in evidence, manage property changes, then complete move-out, settlement, and a final handover report. One property can have many historical tenancies and only one active tenancy at a time.

## Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: Node.js, Express, MongoDB, Mongoose
- Auth: JWT access token and HTTP-only refresh cookie

## Setup

MongoDB must be running locally, or point `MONGO_URI` at another instance.

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

API: [http://localhost:5000/api/health](http://localhost:5000/api/health)

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

App: [http://localhost:5173](http://localhost:5173)

Set strong `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` values in `backend/.env` before using the API outside local development.

## Roles

- Public registration creates an **Owner** account. The client cannot choose a role.
- Tenants join only through an owner invitation link (`/invite/:token`).
- A completed tenancy stays readable. The former tenant cannot change that tenancy. The property can be invited to a new tenant only after the previous tenancy is completed.

## Main flow

1. Owner adds a property and invites a tenant.
2. Both parties complete and approve the move-in inspection. That inspection is the locked baseline.
3. During the tenancy, the tenant requests property changes. The owner approves, rejects, or approves with conditions the tenant must accept.
4. Move-out inspection, comparison, damage assessment, and settlement run against that same tenancy.
5. When move-out, settlement approvals, both signatures, and handover checks are satisfied, the tenancy is completed, a final PDF report is stored, and the property can take a new tenant.

## Layout

```text
backend/     Express API, Mongoose models, uploads, PDF reports
frontend/    React owner and tenant workspaces
```

Uploaded inspection photos, signatures, and generated reports live under `backend/uploads/` and are not committed.
