# School Management System (School ERP) — Kenya

React + Vite + Tailwind client, Node/Express API, MongoDB (Mongoose). Dark-green admin UI modelled on the reference video.

**Read `PROJECT_STATUS.md` first** — it states exactly what is complete, what is partial, and what was tested.

## Quick start (Windows / macOS / Linux)
1. Extract the ZIP and open the `school-management-system` folder in VS Code.
2. In the terminal: `npm install` (installs root, server and client).
3. Create `server/.env` from `.env.example` (copy the file, then edit). Set `MONGODB_URI` (local `mongodb://127.0.0.1:27017/school_erp` or an Atlas string) and a long random `JWT_SECRET`.
   - Windows: `copy .env.example server\.env`
4. Optional demo data: `npm run seed` (prints the dev-only demo password; add `-- --reset` to wipe first).
5. `npm run dev` → API on http://localhost:5000, app on **http://localhost:5173**.

No users exist on a fresh database unless you seed. Create the first admin without seeding:
`POST http://localhost:5000/api/auth/setup` with JSON `{"name","email","password"}` (works only while zero users exist).

Demo logins after seeding: `admin@`, `bursar@`, `deputy@`, `teacher@`, `parent@`, `student@demo-school.example`.
If the password contains `#`, quote it in `.env` (dotenv treats `#` as a comment).

## Scripts
`npm run dev` · `npm run build` (client) · `npm start` (API) · `npm run seed` · `npm test` (logic tests; set `TEST_MONGODB_URI` to a throwaway DB to also run API integration tests).

See `docs/SETUP.md`, `docs/USER_GUIDE.md`, `docs/DEPLOYMENT.md`.
