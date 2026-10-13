# Deployment
1. **MongoDB Atlas**: create a cluster, a DB user, allow Render's IPs (or 0.0.0.0/0 while testing), copy the connection string.
2. **Render (API)**: new Web Service from your Git repo, root dir `server`, build `npm install`, start `node server.js` (or use `render.yaml`). Env: `MONGODB_URI`, `JWT_SECRET` (long random), `CLIENT_ORIGIN` = your Vercel URL, `NODE_ENV=production`.
3. **Vercel (client)**: root dir `client`, framework Vite, env `VITE_API_URL` = your Render URL (no trailing slash). `vercel.json` handles SPA routing.
4. Create the first admin with `POST /api/auth/setup`, then log in and change settings.
## Payments (M-PESA)
`server/services/payments.js` is a stub that returns `not_configured`; no payment is ever faked. To go live, implement Safaricom Daraja STK Push + a validated callback that writes a `payment` entry to the ledger.
## SMS / Email
`services/notify.js` records messages as `not_configured` until you add a provider (e.g. Africa's Talking). Status is never marked delivered without provider confirmation.
## File uploads
Local `server/uploads/` is served at `/uploads`; Render's disk is ephemeral, so use Cloudinary/S3 in production (not wired yet).
