# ReturnReady API

Express API for the ReturnReady owner–tenant handover app. See the repository README for the product flow.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

Requires Node.js 18+ and MongoDB. Health check: [http://localhost:5000/api/health](http://localhost:5000/api/health)

`npm start` runs the API without file watching. `predev` frees port 5000 if a previous dev process is still bound to it.

## Environment

Copy `.env.example`. Required values:

- `MONGO_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CLIENT_URL` — comma-separated frontend origins allowed by CORS

## Routes

| Prefix | Purpose |
|--------|---------|
| `/api/auth` | Owner registration, login, session, refresh, logout |
| `/api/properties` | Property CRUD, photos, tenancy history |
| `/api/tenancies` | Invitations, dates, move-out, extensions |
| `/api/invitations` | Tenant invitation acceptance |
| `/api/inspections` | Move-in and move-out inspections, evidence, meters, keys |
| `/api` | Handover conditions and property change requests |
| `/api/settlement` | Comparison, damage, deductions, disputes, signatures, handover, reports |
| `/api/notifications` | In-app notifications |
| `/uploads` | Inspection photos, signatures, repair images, PDF reports |

## Scripts

```bash
npm run smoke:auth
npm run smoke:property
npm run smoke:inspection
```

## Layout

```text
src/
├── config/
├── controllers/
├── middleware/
├── models/
├── routes/
├── services/
├── utils/
├── validators/
├── app.js
└── server.js
uploads/    local files, gitignored
```
