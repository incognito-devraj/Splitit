# Splitit — Deployment Guide

## Stack
- **Frontend**: React + Vite → deploy to **Vercel** (recommended) or Netlify
- **Backend**: Node.js + Express → deploy to **Render** (recommended) or Railway
- **Database**: MongoDB Atlas (already configured)
- **Auth**: Google OAuth

---

## Step 1 — MongoDB Atlas

Your Atlas cluster is already set up. Before deploying:

1. Go to **Atlas → Network Access**
2. Add `0.0.0.0/0` (allow all IPs) — required for Render/Railway which use dynamic IPs
3. Or add your deployment platform's IP range specifically

---

## Step 2 — Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials
2. Click your OAuth 2.0 Client ID
3. Under **Authorized JavaScript Origins** add:
   ```
   https://your-app.vercel.app
   https://your-custom-domain.com
   ```
4. Under **Authorized Redirect URIs** add:
   ```
   https://your-app.vercel.app
   https://your-custom-domain.com
   ```
5. Save and wait ~5 minutes

---

## Step 3 — Generate Strong JWT Secrets

Run this in your terminal to generate production secrets:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Run it **twice** — one for `JWT_SECRET`, one for `JWT_REFRESH_SECRET`.

---

## Step 4 — Deploy Backend (Render)

1. Push your code to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo, select the `backend` folder
4. Settings:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Node Version**: 18+
5. Add these **Environment Variables**:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `MONGODB_URI` | Your Atlas connection string |
| `JWT_SECRET` | 64-char hex string (generated above) |
| `JWT_REFRESH_SECRET` | 64-char hex string (generated above) |
| `JWT_ACCESS_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `GOOGLE_CLIENT_ID` | Your Google Client ID |
| `GOOGLE_CLIENT_SECRET` | Your Google Client Secret |
| `FRONTEND_URL` | `https://your-app.vercel.app` |
| `RATE_LIMIT_WINDOW_MS` | `900000` |
| `RATE_LIMIT_MAX` | `300` |

6. Deploy. Note your backend URL: `https://splitit-backend.onrender.com`

---

## Step 5 — Deploy Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo, select the `frontend` folder
3. Framework: **Vite**
4. Build settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add these **Environment Variables**:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://splitit-backend.onrender.com/api` |
| `VITE_GOOGLE_CLIENT_ID` | Your Google Client ID |

6. Deploy. Note your frontend URL: `https://splitit.vercel.app`

---

## Step 6 — Update Backend CORS

After deploying frontend, go back to Render and update:

| Key | Value |
|-----|-------|
| `FRONTEND_URL` | `https://splitit.vercel.app` |

Render will auto-redeploy.

---

## Step 7 — Verify Everything Works

Run these checks after deployment:

### Backend health
```
GET https://splitit-backend.onrender.com/health
```
Expected: `{ "success": true, "data": { "status": "ok" } }`

### Login flow
1. Open `https://splitit.vercel.app`
2. Click "Continue with Google"
3. Should redirect to home after login

### Group join
1. User A creates a group → copies invite code
2. User B opens app in incognito → enters invite code → sends join request
3. User A approves → User B refreshes → should be in group

---

## Local Development

### Backend
```bash
cd backend
cp .env.production.example .env   # fill in your values
npm install
npm run dev                        # starts on :5000
```

### Frontend
```bash
cd frontend
cp .env.production.example .env   # fill in your values
npm install
npm run dev                        # starts on :3000
```

---

## Common Issues

| Problem | Fix |
|---------|-----|
| `CORS blocked` | Add your frontend URL to `FRONTEND_URL` env var on backend |
| `Google sign-in failed` | Add your deployed URL to Google Cloud Console Authorized Origins |
| `MongoDB connection failed` | Add `0.0.0.0/0` to Atlas Network Access |
| `Too many requests` | Rate limiting is active in prod — normal for abuse protection |
| `JWT_SECRET too short` | Must be 64+ chars in production |
| Render sleeps after 15 min | Free tier — upgrade to paid or use Railway |

---

## Security Checklist Before Going Live

- [ ] `NODE_ENV=production` is set
- [ ] JWT secrets are 64+ random hex chars (not the dev defaults)
- [ ] `.env` files are in `.gitignore` and NOT committed
- [ ] Google OAuth origins include your production URL
- [ ] MongoDB Atlas IP whitelist is configured
- [ ] Swagger docs are disabled (automatic in production)
- [ ] Rate limiting is active (automatic in production)
- [ ] `FRONTEND_URL` points to your actual deployed frontend
