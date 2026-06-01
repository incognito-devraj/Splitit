# Splitit Deployment Guide

This app is deployed as:

- Backend: Render Web Service from `backend`
- Frontend: Vercel project from `frontend`
- Database: MongoDB Atlas
- Auth: Google OAuth 2.0 client ID used by both frontend and backend

## Required Environment Variables

Backend on Render:

| Key | Required | Example |
| --- | --- | --- |
| `NODE_ENV` | Yes | `production` |
| `PORT` | Yes | `5000` |
| `MONGODB_URI` | Yes | `mongodb+srv://USER:PASSWORD@cluster.mongodb.net/splitit?retryWrites=true&w=majority` |
| `JWT_SECRET` | Yes | 64+ character random value |
| `JWT_REFRESH_SECRET` | Yes | Different 64+ character random value |
| `JWT_ACCESS_EXPIRES_IN` | Yes | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Yes | `7d` |
| `GOOGLE_CLIENT_ID` | Yes | `YOUR_CLIENT_ID.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `FRONTEND_URL` | Yes | `https://your-app.vercel.app` |
| `API_PUBLIC_URL` | No | `https://your-backend.onrender.com` |
| `CORS_ORIGINS` | No | `https://www.your-domain.com` |
| `RATE_LIMIT_WINDOW_MS` | Yes | `900000` |
| `RATE_LIMIT_MAX` | Yes | `300` |

Frontend on Vercel:

| Key | Required | Example |
| --- | --- | --- |
| `VITE_API_URL` | Yes | `https://your-backend.onrender.com/api` |
| `VITE_GOOGLE_CLIENT_ID` | Yes | `YOUR_CLIENT_ID.apps.googleusercontent.com` |

Production startup validates these values. Production `JWT_SECRET` and `JWT_REFRESH_SECRET` must be at least 64 characters, `FRONTEND_URL` must not be localhost, CORS origins must be valid URLs, and `VITE_API_URL` must point to a deployed backend.

## MongoDB Atlas Setup

1. Create or open an Atlas cluster.
2. Create a database user with read/write access to the Splitit database.
3. In Network Access, allow Render to connect. For Render free/dynamic egress, `0.0.0.0/0` is commonly used; a paid/static egress option is tighter.
4. Copy the SRV connection string and set it as `MONGODB_URI`.
5. Include a database name in the URI, for example `/splitit`.

## Google Cloud OAuth Setup

1. Open Google Cloud Console, then APIs & Services, then Credentials.
2. Create or edit an OAuth 2.0 Client ID for a web application.
3. Add Authorized JavaScript origins:
   - `http://localhost:3000`
   - `https://your-app.vercel.app`
   - Any custom production domain
4. If Google asks for redirect URIs, add your frontend origins as HTTPS URLs. The app uses Google Identity Services client-side login, so the key production requirement is Authorized JavaScript origins.
5. Put the client ID in both backend `GOOGLE_CLIENT_ID` and frontend `VITE_GOOGLE_CLIENT_ID`.
6. Put the client secret in backend `GOOGLE_CLIENT_SECRET` only. Never expose it in Vercel frontend env vars.

## Render Backend Deployment

1. Push the repo to GitHub.
2. In Render, create a Web Service.
3. Select the GitHub repo and set Root Directory to `backend`.
4. Use Node `20` or newer.
5. Build command: `npm install && npm run build`
6. Start command: `npm start`
7. Add all backend environment variables from the table above.
8. Deploy and verify `https://your-backend.onrender.com/health`.

Expected health response:

```json
{ "success": true, "data": { "status": "ok" } }
```

## Vercel Frontend Deployment

1. In Vercel, create a new project from the same GitHub repo.
2. Set Root Directory to `frontend`.
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add `VITE_API_URL` and `VITE_GOOGLE_CLIENT_ID`.
6. Deploy.
7. Copy the Vercel URL and set backend `FRONTEND_URL` on Render to that exact origin with no trailing slash.
8. Redeploy the Render backend after updating `FRONTEND_URL`.

## Local Development

Backend:

```bash
cd backend
npm install
cp .env.production.example .env
npm run dev
```

Frontend:

```bash
cd frontend
npm install
cp .env.production.example .env
npm run dev
```

For localhost, use:

```bash
VITE_API_URL=http://localhost:5000/api
```

The backend development CORS policy allows common localhost frontend ports including `3000`, `5173`, `8080`, and `8081`.

## Verification Checklist

- Backend `npm run build` passes.
- Frontend `npm run build` passes.
- Render `/health` returns success.
- Google login works on localhost and production.
- Create group, join group, create/edit/delete expense, settlement, balances, guest participants, financial summary, and refresh persistence are tested manually.
- Mobile layout is checked in browser dev tools or on a real device.
- `.env`, `.env.local`, `.env.production`, and `.env.development` are ignored.
- No real credentials are committed.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Backend exits with invalid env vars | Check Render env values, especially JWT length, `FRONTEND_URL`, and `MONGODB_URI`. |
| CORS blocked | Set backend `FRONTEND_URL` to the exact Vercel origin. Add only trusted extra origins to `CORS_ORIGINS`. |
| Google sign-in fails | Add the exact localhost or production frontend origin to Google OAuth Authorized JavaScript origins. |
| MongoDB connection fails | Check Atlas username/password, database user permissions, URI database name, and Network Access. |
| Frontend build fails with `VITE_API_URL` | Set Vercel `VITE_API_URL` to the Render backend URL ending in `/api`. |
| JWT secret too short | Generate separate 64+ character values for `JWT_SECRET` and `JWT_REFRESH_SECRET`. |

Generate JWT secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Run that command twice and use different values.
