# ReturnReady Frontend

React + TypeScript UI connected to the Node.js API and MongoDB.

## Setup

```bash
cd frontend
npm install
```

Create `.env` (see `.env.example`):

```env
VITE_API_URL=http://localhost:5000/api
```

Start the backend first (`cd backend && npm run dev`), then:

```bash
npm run dev
```

## Auth flow

1. Owner registers at `/register/owner` → `POST /api/auth/register`
2. Login at `/login` → `POST /api/auth/login` (role comes from MongoDB)
3. Session restore on reload → `GET /api/auth/me`
4. Tenant joins via `/invite/:token` only (no public tenant signup)

Access token is stored in `sessionStorage`; refresh token uses an HTTP-only cookie.

## Integrated APIs

| Feature | Endpoints |
|---------|-----------|
| Auth | `/api/auth/*` |
| Properties | `/api/properties` |
| Tenancies / invites | `/api/tenancies`, `/api/invitations` |

Inspection and settlement screens remain in the UI as empty states until those backend modules are added.
