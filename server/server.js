require('dotenv').config({ path: require('path').join(__dirname, '.env') });
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const connectDB = require('./config/db'); const app = require('./app');
const port = process.env.PORT || 5000;
(async () => {
  if (!process.env.JWT_SECRET) { console.error('JWT_SECRET missing. Copy .env.example to server/.env'); process.exit(1); }
  try { await connectDB(); } catch (e) { console.error('Could not connect to MongoDB:', e.message, '\nStart MongoDB locally or set MONGODB_URI to an Atlas string.'); process.exit(1); }
  app.listen(port, () => console.log(`API running on http://localhost:${port}`));
})();
