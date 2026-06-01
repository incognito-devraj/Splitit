# PG Expense Splitter — Full Build Documentation

> **Purpose:** Complete reference for the backend build. Use this during interviews, onboarding, or future development.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Folder Structure](#4-folder-structure)
5. [Database Models](#5-database-models)
6. [Authentication Flow](#6-authentication-flow)
7. [API Endpoints](#7-api-endpoints)
8. [Business Logic](#8-business-logic)
9. [Security Implementation](#9-security-implementation)
10. [Middleware Chain](#10-middleware-chain)
11. [Validation Strategy](#11-validation-strategy)
12. [Error Handling](#12-error-handling)
13. [Testing Strategy](#13-testing-strategy)
14. [Environment Variables](#14-environment-variables)
15. [Deployment Guide (Render)](#15-deployment-guide-render)
16. [Frontend Integration Guide](#16-frontend-integration-guide)
17. [Key Design Decisions](#17-key-design-decisions)
18. [Interview Talking Points](#18-interview-talking-points)

---

## 1. Project Overview

**PG Expense Splitter (Splito)** is a mobile-first expense-sharing app for PG (Paying Guest) residents. Users create or join a PG group, add shared expenses, and the system automatically calculates who owes whom.

### Core Features
- Google OAuth (passwordless login)
- JWT access + refresh token rotation
- PG group creation and invite-code-based joining
- Expense creation with automatic split calculation
- Balance engine derived purely from expenses + settlements (no stored balances)
- Settlement recording with instant balance recalculation
- WhatsApp-ready summary generation
- Role-based access (Admin / Member)

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Express.js 4 |
| Language | TypeScript 5 (strict mode) |
| Database | MongoDB Atlas via Mongoose 8 |
| Auth | Google OAuth 2.0 + JWT (jsonwebtoken) |
| Validation | Zod 3 |
| Security | Helmet, CORS, express-rate-limit, express-mongo-sanitize |
| Logging | Winston |
| API Docs | Swagger UI (swagger-jsdoc + swagger-ui-express) |
| Testing | Jest + ts-jest + Supertest + mongodb-memory-server |
| Dev Server | tsx (watch mode) |
| Deployment | Render |

---

## 3. Architecture

The backend follows **Clean Architecture** with clear separation of concerns:

```
HTTP Request
    ↓
Route (Express Router)
    ↓
Middleware (auth, group, validation, rate-limit)
    ↓
Controller (thin — only HTTP in/out)
    ↓
Service (business logic)
    ↓
Repository (data access — Mongoose queries)
    ↓
Model (Mongoose schema)
    ↓
MongoDB Atlas
```

### Why this layering?
- **Controllers** never touch Mongoose directly — they only call services and format HTTP responses.
- **Services** contain all business rules (e.g., "payer is always auto-included in sharedWith").
- **Repositories** are the only layer that knows about Mongoose — swapping the DB only requires changing repositories.
- **Validators** (Zod) run in middleware before the controller is ever called.

---

## 4. Folder Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts       # MongoDB connection with graceful reconnect
│   │   ├── env.ts            # Zod-validated environment variables (fails fast)
│   │   └── swagger.ts        # OpenAPI 3.0 spec configuration
│   ├── constants/
│   │   └── index.ts          # HTTP status codes, error messages, enums
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── balance.controller.ts
│   │   ├── expense.controller.ts
│   │   ├── group.controller.ts
│   │   ├── settlement.controller.ts
│   │   └── summary.controller.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts        # JWT verification + user attach
│   │   ├── admin.middleware.ts       # Role check (admin only)
│   │   ├── group.middleware.ts       # Ensures user is in a group
│   │   ├── error.middleware.ts       # Global error handler
│   │   ├── rateLimit.middleware.ts   # General + auth-specific limiters
│   │   └── validation.middleware.ts  # Zod schema validation factory
│   ├── models/
│   │   ├── User.ts
│   │   ├── PGGroup.ts
│   │   ├── Expense.ts
│   │   └── Settlement.ts
│   ├── repositories/
│   │   ├── user.repository.ts
│   │   ├── group.repository.ts
│   │   ├── expense.repository.ts
│   │   └── settlement.repository.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── group.routes.ts
│   │   ├── expense.routes.ts
│   │   ├── balance.routes.ts
│   │   ├── settlement.routes.ts
│   │   └── summary.routes.ts
│   ├── services/
│   │   ├── auth.service.ts       # Google OAuth + JWT logic
│   │   ├── balance.service.ts    # Core balance calculation engine
│   │   ├── expense.service.ts    # Expense CRUD + split logic
│   │   ├── group.service.ts      # Group management
│   │   ├── settlement.service.ts # Settlement recording
│   │   └── summary.service.ts    # Report + WhatsApp text generation
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces and enums
│   ├── utils/
│   │   ├── apiResponse.ts        # Standardized success/error helpers
│   │   ├── inviteCode.ts         # Cryptographically safe invite code generator
│   │   ├── jwt.ts                # Sign/verify access and refresh tokens
│   │   └── logger.ts             # Winston logger (dev: colorized, prod: JSON)
│   ├── validators/
│   │   ├── auth.validator.ts
│   │   ├── expense.validator.ts
│   │   ├── group.validator.ts
│   │   └── settlement.validator.ts
│   ├── __tests__/
│   │   ├── setup.ts              # MongoDB Memory Server setup/teardown
│   │   ├── testEnv.ts            # Test environment variables
│   │   ├── unit/
│   │   │   ├── balance.service.test.ts
│   │   │   ├── inviteCode.test.ts
│   │   │   └── summary.service.test.ts
│   │   └── integration/
│   │       ├── auth.test.ts
│   │       ├── group.test.ts
│   │       ├── expense.test.ts
│   │       └── balance.test.ts
│   ├── app.ts                    # Express app setup (no server.listen)
│   └── server.ts                 # Bootstrap: DB connect + server.listen
├── .env.example
├── jest.config.js
├── package.json
└── tsconfig.json
```

---

## 5. Database Models

### User
```typescript
{
  _id: ObjectId,
  name: string,           // from Google profile
  email: string,          // unique, lowercase
  avatar: string,         // Google profile picture URL
  googleId: string,       // Google sub — never exposed in API responses
  role: 'admin' | 'member',
  groupId: ObjectId | null,  // ref: PGGroup
  refreshToken: string,   // select: false — never returned in queries
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes:** `email`, `googleId`, `groupId`

### PGGroup
```typescript
{
  _id: ObjectId,
  name: string,
  inviteCode: string,     // 8-char uppercase, unique
  adminId: ObjectId,      // ref: User
  members: ObjectId[],    // ref: User[]
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes:** `inviteCode`, `adminId`

### Expense
```typescript
{
  _id: ObjectId,
  title: string,
  category: 'food' | 'grocery' | 'electricity' | 'wifi' | 'rent' | 'gas' | 'maid' | 'water' | 'other',
  amount: number,
  paidBy: ObjectId,       // ref: User — always set from req.user.id
  sharedWith: ObjectId[], // ref: User[] — payer always auto-included
  splitAmount: number,    // amount / sharedWith.length — stored for quick reads
  groupId: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes:** `(groupId, createdAt)`, `paidBy`, `(groupId, category)`

### Settlement
```typescript
{
  _id: ObjectId,
  fromUser: ObjectId,   // who paid
  toUser: ObjectId,     // who received
  amount: number,
  groupId: ObjectId,
  createdAt: Date       // no updatedAt — settlements are immutable
}
```
**Indexes:** `(groupId, createdAt)`, `fromUser`, `toUser`

---

## 6. Authentication Flow

### Google OAuth Login
```
Client                    Backend                    Google
  |                          |                          |
  |-- POST /api/auth/google  |                          |
  |   { idToken }            |                          |
  |                          |-- verifyIdToken() ------>|
  |                          |<-- { sub, email, name }--|
  |                          |                          |
  |                          |-- upsert User in MongoDB |
  |                          |-- sign accessToken (15m) |
  |                          |-- sign refreshToken (7d) |
  |                          |-- store refreshToken     |
  |<-- { user, accessToken,  |                          |
  |      refreshToken }      |                          |
```

### Token Refresh (Rotation)
- Client sends `refreshToken` to `POST /api/auth/refresh`
- Backend verifies signature AND checks it matches the stored token in DB
- Issues new `accessToken` + new `refreshToken` (rotation prevents replay attacks)
- Old refresh token is invalidated immediately

### Protected Route Flow
```
Client                    Backend
  |                          |
  |-- GET /api/expenses      |
  |   Authorization: Bearer <accessToken>
  |                          |
  |                          |-- verifyAccessToken()
  |                          |-- findById(payload.userId) — DB check
  |                          |-- attach req.user = { id, email, role, groupId }
  |                          |-- next()
  |                          |
  |<-- 200 { data: [...] }   |
```

---

## 7. API Endpoints

### Authentication
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/google` | ❌ | Exchange Google ID token for JWT |
| POST | `/api/auth/refresh` | ❌ | Rotate refresh token |
| POST | `/api/auth/logout` | ✅ | Invalidate refresh token |
| GET | `/api/auth/me` | ✅ | Get current user profile |

### Groups
| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| POST | `/api/groups` | ✅ | Any | Create a new PG group |
| POST | `/api/groups/join` | ✅ | Any | Join via invite code |
| GET | `/api/groups/current` | ✅ | Member+ | Get current group |
| GET | `/api/groups/members` | ✅ | Member+ | List all members |
| POST | `/api/groups/leave` | ✅ | Member | Leave group |
| POST | `/api/groups/invite/regenerate` | ✅ | Admin | New invite code |
| DELETE | `/api/groups/member/:id` | ✅ | Admin | Remove a member |

### Expenses
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/expenses` | ✅ | Create expense (paidBy = req.user) |
| GET | `/api/expenses` | ✅ | List with pagination + filters |
| GET | `/api/expenses/:id` | ✅ | Get single expense |
| PUT | `/api/expenses/:id` | ✅ | Update (payer only) |
| DELETE | `/api/expenses/:id` | ✅ | Delete (payer or admin) |

**Query params for GET /api/expenses:**
- `category` — filter by category
- `startDate` / `endDate` — date range (ISO 8601)
- `page` (default: 1), `limit` (default: 20, max: 100)

### Balances
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/balances` | ✅ | All group balances |
| GET | `/api/balances/member/:id` | ✅ | Single member balance |

### Settlements
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/settlements` | ✅ | Record a payment |
| GET | `/api/settlements` | ✅ | List all settlements |

### Summary
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/summary` | ✅ | Full report + WhatsApp text |

### Utility
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | ❌ | Health check |
| GET | `/api/docs` | ❌ | Swagger UI |
| GET | `/api/docs.json` | ❌ | OpenAPI JSON spec |

---

## 8. Business Logic

### Expense Creation — Critical Rule
> **The logged-in user is ALWAYS the payer. `paidBy` is never accepted from the request body.**

```typescript
// In ExpenseController.createExpense:
const expense = await expenseService.createExpense({
  ...req.body,
  paidBy: user.id,   // ← always from JWT, never from body
  groupId: user.groupId,
});
```

### Auto-Include Payer in sharedWith
If the payer is not listed in `sharedWith`, they are automatically added:
```typescript
const sharedWithSet = new Set(sharedWith);
sharedWithSet.add(paidBy);  // payer always participates
const finalSharedWith = [...sharedWithSet];
```

### Balance Engine (BalanceService.computeBalances)

**Formula:**
```
For each expense:
  - Each person in sharedWith: balance -= (amount / sharedWith.length)
  - Payer: balance += amount

For each settlement:
  - fromUser (payer): balance += amount
  - toUser (receiver): balance -= amount
```

**Example:**
```
₹600 dinner, paid by Raj, split with [Raj, Aman, Devraj, You]
  → Each owes ₹150
  → Raj: -150 + 600 = +450 (should receive)
  → Others: -150 each

Aman pays Raj ₹150 (settlement):
  → Aman: -150 + 150 = 0 (settled)
  → Raj: +450 - 150 = +300 (still receivable from others)
```

**Key design:** Balances are **never stored** — always derived from expenses + settlements. This prevents data inconsistency.

### Summary Generation
```typescript
// WhatsApp text format:
📌 *Sunrise PG — Expense Summary*
📅 29 May 2026
💰 Total spent: ₹3,639

✅ Devraj receives ₹750
🔴 Raj owes ₹300
🔴 Aman owes ₹450

_Powered by PG Splito_
```

---

## 9. Security Implementation

| Concern | Solution |
|---|---|
| XSS / clickjacking | `helmet()` sets 11 security headers |
| CORS | Whitelist only `FRONTEND_URL` |
| NoSQL injection | `express-mongo-sanitize` strips `$` and `.` from inputs |
| Rate limiting | 100 req/15min general; 20 req/15min for auth |
| JWT security | Short-lived access tokens (15m) + rotating refresh tokens (7d) |
| Secrets in responses | `googleId` and `refreshToken` excluded via Mongoose `toJSON` transform |
| Input validation | Zod validates all request bodies, params, and query strings |
| Request size | `express.json({ limit: '10kb' })` prevents large payload attacks |
| Passwordless | No passwords stored — Google OAuth only |

---

## 10. Middleware Chain

### For a protected group route (e.g., POST /api/expenses):
```
rateLimitMiddleware       → check request count
authMiddleware            → verify JWT, attach req.user
groupMiddleware           → ensure req.user.groupId exists
validate(schema)          → Zod validation of body/params/query
expenseController.create  → business logic
errorMiddleware           → catch any thrown errors
```

### Middleware execution order in app.ts:
1. `helmet()` — security headers
2. `cors()` — CORS policy
3. `express.json()` — body parsing
4. `mongoSanitize()` — NoSQL injection protection
5. `morgan` — HTTP request logging
6. `rateLimitMiddleware` — rate limiting
7. Route handlers (with their own middleware chains)
8. 404 handler
9. `errorMiddleware` — global error handler

---

## 11. Validation Strategy

All validation uses **Zod** with a generic middleware factory:

```typescript
// validation.middleware.ts
export function validate(schema: ZodSchema) {
  return (req, res, next) => {
    const result = schema.parse({
      body: req.body,
      params: req.params,
      query: req.query,
    });
    // Assign coerced values back (e.g., string "20" → number 20)
    req.body = result.body;
    req.params = result.params;
    req.query = result.query;
    next();
  };
}

// Usage in routes:
router.post('/', validate(createExpenseSchema), expenseController.createExpense);
```

Validation errors return:
```json
{
  "success": false,
  "message": "body.amount: Amount must be greater than 0; body.category: Invalid category"
}
```

---

## 12. Error Handling

### Standardized API Response
```typescript
// Success
{ "success": true, "data": { ... } }
{ "success": true, "data": [...], "pagination": { "total": 50, "page": 1, ... } }

// Error
{ "success": false, "message": "Error description" }
```

### Error Resolution in errorMiddleware
The global error handler maps known error messages to HTTP status codes:
- `"User not found"` → 404
- `"Already in a group"` → 409
- `"Invalid invite code"` → 400
- `"Admin cannot leave"` → 403
- Unknown errors → 500 (message hidden, logged internally)

### AppError class
```typescript
throw new AppError('Custom message', 403);
// → { success: false, message: "Custom message" } with 403 status
```

---

## 13. Testing Strategy

### Test Setup
- **mongodb-memory-server** — spins up an in-memory MongoDB for each test run
- `afterEach` clears all collections — each test starts with a clean DB
- Google OAuth is mocked via `jest.mock('google-auth-library')`
- Environment variables set via `setupFiles` before any module loads

### Test Coverage

| Suite | Tests | What's Covered |
|---|---|---|
| `unit/balance.service.test.ts` | 5 | Balance engine math, settlements, edge cases |
| `unit/inviteCode.test.ts` | 3 | Code length, charset, uniqueness |
| `unit/summary.service.test.ts` | 3 | WhatsApp text format |
| `integration/auth.test.ts` | 8 | Google login, refresh, logout, /me |
| `integration/group.test.ts` | 7 | Create, join, current, 403 guard |
| `integration/expense.test.ts` | 12 | CRUD, filters, pagination, auth guards |
| `integration/balance.test.ts` | 8 | Balances, settlements, summary |
| **Total** | **46** | **All passing** |

### Running Tests
```bash
npm test                    # all tests
npm test -- --testPathPattern=unit      # unit only
npm test -- --testPathPattern=auth      # auth only
npm run test:coverage       # with coverage report
```

---

## 14. Environment Variables

```bash
# Server
PORT=5000
NODE_ENV=development        # development | production | test

# MongoDB Atlas
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/splito

# JWT (minimum 32 characters each)
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_REFRESH_SECRET=your_super_secret_refresh_key_min_32_chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx

# Frontend (for CORS)
FRONTEND_URL=https://your-frontend.lovable.app

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000   # 15 minutes in ms
RATE_LIMIT_MAX=100
```

**Validation:** All env vars are validated at startup using Zod. If any required var is missing, the process exits with a clear error message.

---

## 15. Deployment Guide (Render)

### Steps

1. **Push backend to GitHub** (separate repo or monorepo)

2. **Create a new Web Service on Render**
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Root Directory: `backend/` (if monorepo)

3. **Set Environment Variables** in Render dashboard (all vars from `.env.example`)

4. **MongoDB Atlas Setup**
   - Create a free M0 cluster
   - Add Render's IP to Atlas Network Access (or allow `0.0.0.0/0` for simplicity)
   - Get the connection string and set as `MONGODB_URI`

5. **Google OAuth Setup**
   - Go to Google Cloud Console → APIs & Services → Credentials
   - Create OAuth 2.0 Client ID (Web application)
   - Add your Render URL to Authorized JavaScript origins
   - Copy Client ID and Secret to Render env vars

6. **Health Check**
   - Render health check path: `/health`

### render.yaml (optional)
```yaml
services:
  - type: web
    name: splito-api
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: JWT_REFRESH_SECRET
        generateValue: true
```

---

## 16. Frontend Integration Guide

### Base URL
```typescript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
```

### Authentication
```typescript
// 1. Get Google ID token from Google Sign-In button
const { credential } = await google.accounts.id.initialize(...)

// 2. Exchange for JWT
const res = await fetch(`${API_BASE}/auth/google`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ idToken: credential }),
});
const { data: { accessToken, refreshToken, user } } = await res.json();

// 3. Store tokens (localStorage or secure cookie)
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);
```

### Making Authenticated Requests
```typescript
const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('accessToken');
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
};
```

### Creating an Expense
```typescript
// Note: paidBy is NOT sent — backend sets it from JWT
await authFetch(`${API_BASE}/expenses`, {
  method: 'POST',
  body: JSON.stringify({
    title: 'Dinner — Biryani',
    category: 'food',
    amount: 600,
    sharedWith: ['userId1', 'userId2', 'userId3', 'userId4'],
  }),
});
```

### Replacing the Frontend Store
The current frontend uses Zustand with seed data. To connect to the real backend:

1. Replace `useStore` calls with React Query hooks
2. Map backend response fields:
   - `expense.sharedWith` (backend) ↔ `expense.splitWith` (frontend store)
   - `expense.createdAt` (ISO string) ↔ `expense.date` (timestamp number)
   - `member._id` (backend) ↔ `member.id` (frontend store)

---

## 17. Key Design Decisions

### 1. Balances are never stored
**Decision:** Compute balances on-the-fly from expenses + settlements.
**Why:** Storing balances creates a dual-write problem — you'd need to update balances atomically with every expense/settlement. Deriving them is always consistent and correct.
**Tradeoff:** Slightly slower for large groups, but acceptable for PG scale (< 20 members).

### 2. paidBy is always from JWT
**Decision:** The backend ignores any `paidBy` field in the request body.
**Why:** Prevents users from submitting expenses on behalf of others, which would be a security vulnerability.

### 3. Payer is auto-included in sharedWith
**Decision:** If the payer isn't in `sharedWith`, they're automatically added.
**Why:** It makes no sense for the payer to not participate in their own expense. This prevents a class of user errors.

### 4. Refresh token rotation
**Decision:** Every refresh issues a new refresh token and invalidates the old one.
**Why:** If a refresh token is stolen, the attacker can only use it once before the legitimate user's next refresh invalidates it.

### 5. Invite codes use unambiguous characters
**Decision:** Charset excludes `0`, `O`, `1`, `I` (easily confused visually).
**Why:** Users share invite codes verbally or via screenshots — ambiguous characters cause join failures.

### 6. Settlements are immutable
**Decision:** No `updatedAt` on Settlement, no update/delete endpoints.
**Why:** Financial records should be append-only. If a settlement was wrong, record a correcting settlement.

---

## 18. Interview Talking Points

### "Walk me through the architecture"
> "I used clean architecture with four layers: routes → controllers → services → repositories. Controllers are thin — they only handle HTTP concerns. All business logic lives in services. Repositories are the only layer that touches Mongoose, so the DB is swappable. Zod validation runs in middleware before the controller is ever called."

### "How does the balance calculation work?"
> "Balances are never stored — they're always derived from expenses and settlements. For each expense, every person in sharedWith gets debited their share, and the payer gets credited the full amount. Settlements then adjust those balances. This is the same approach Splitwise uses — it prevents data inconsistency from dual-writes."

### "How did you secure the API?"
> "Multiple layers: Helmet for HTTP security headers, CORS whitelist, express-mongo-sanitize for NoSQL injection, Zod for input validation, rate limiting (stricter on auth endpoints), JWT with short-lived access tokens and rotating refresh tokens, and the paidBy field is always taken from the JWT — never from the request body."

### "How does Google OAuth work here?"
> "The frontend uses Google's client-side SDK to get an ID token. That token is sent to our backend, which verifies it with Google's servers using the google-auth-library. We then upsert the user in MongoDB and issue our own JWT pair. We never store passwords — it's fully passwordless."

### "How did you test this?"
> "46 tests total — unit tests for the balance engine and utilities, integration tests for all API endpoints using Supertest and an in-memory MongoDB (mongodb-memory-server). Google OAuth is mocked. Each test runs against a clean database via afterEach cleanup."

### "What would you improve with more time?"
> "Add Redis for refresh token storage (faster invalidation, no DB hit on every request), implement WebSocket notifications for real-time balance updates, add expense categories analytics with aggregation pipelines, and add a proper CI/CD pipeline with GitHub Actions."
