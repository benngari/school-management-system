# Setup
- Node 18+ (tested on Node 22), MongoDB 6+ (local or Atlas).
- `npm install` at the repo root also installs `server/` and `client/`.
- Env vars live in `server/.env` (see `.env.example`). The client needs none locally (Vite proxies `/api`).
- Atlas on Windows: if `mongodb+srv://` fails to resolve, set your DNS to 8.8.8.8.
- Tests: `npm test` runs pure-logic tests. For API integration tests use a **disposable** database (it is dropped): `set TEST_MONGODB_URI=mongodb://127.0.0.1:27017/school_erp_test` then `npm test`.
- Architecture: `server/routes/index.js` maps URLs → controllers; most secondary modules use the generic factory `controllers/crud.js`; business rules are in `server/services/` (finance ledger, duty scheduler, grading). Permissions: `server/utils/permissions.js`.
