# ReturnReady Backend — Authentication API

Secure Owner authentication foundation for ReturnReady using Node.js, Express, MongoDB, Mongoose, JWT, and bcrypt.

## Features

- Owner-only public registration (`role` is always `OWNER`)
- Login with generic auth failure messages
- Access token (JWT) + refresh token (HTTP-only cookie)
- `GET /api/auth/me` for session restore
- Role middleware (`requireOwner` / `requireTenant`) ready for later features
- Helmet, CORS, rate limiting, Zod validation, centralized errors

## Setup

1. Install [MongoDB](https://www.mongodb.com/) locally (or use Atlas) and ensure it is running.

2. Install dependencies:

```bash
cd backend
npm install
```

3. Configure environment:

```bash
cp .env.example .env
```

Edit `.env` and set strong `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` values.

4. Start the API:

```bash
npm run dev
```

Health check: [http://localhost:5000/api/health](http://localhost:5000/api/health)

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | No | Health check |
| `POST` | `/api/auth/register` | No | Create Owner account |
| `POST` | `/api/auth/login` | No | Login |
| `GET` | `/api/auth/me` | Bearer | Current user |
| `POST` | `/api/auth/refresh` | Cookie | Refresh access token |
| `POST` | `/api/auth/logout` | Bearer | Logout & clear refresh cookie |

## Example requests

### Register Owner

```http
POST /api/auth/register
Content-Type: application/json
```

```json
{
  "name": "Rahul Patel",
  "email": "rahul@example.com",
  "phone": "9876543210",
  "password": "Password123"
}
```

Sending `"role": "TENANT"` in the body is ignored — the account is always created as `OWNER`.

### Login

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "email": "rahul@example.com",
  "password": "Password123"
}
```

Response includes `accessToken` and sets an HTTP-only `refreshToken` cookie (path `/api/auth`).

### Current user

```http
GET /api/auth/me
Authorization: Bearer <access-token>
```

### Refresh

```http
POST /api/auth/refresh
```

Sends the refresh cookie automatically when `credentials: include` is used from the frontend.

### Logout

```http
POST /api/auth/logout
Authorization: Bearer <access-token>
```

## Frontend integration notes

1. Store `accessToken` in memory (preferred) or short-lived storage.
2. Call APIs with `Authorization: Bearer <token>` and `credentials: 'include'`.
3. On app load, call `GET /api/auth/me`.
4. Redirect by `user.role`:
   - `OWNER` → `/owner/dashboard`
   - `TENANT` → `/tenant/dashboard`
5. Never let the client choose or change roles.

## Role rules

- Public registration creates **OWNER** only.
- No public Tenant signup endpoint.
- Tenant accounts will be created later via Owner invitations.
- No `change-role` API — roles are immutable after creation.

## Project structure

```text
backend/
├── src/
│   ├── config/db.js
│   ├── controllers/auth.controller.js
│   ├── middleware/
│   ├── models/User.js
│   ├── routes/auth.routes.js
│   ├── services/auth.service.js
│   ├── utils/
│   ├── validators/auth.validator.js
│   ├── app.js
│   └── server.js
├── .env.example
├── package.json
└── README.md
```
