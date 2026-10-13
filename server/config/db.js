const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); // fixes querySrv ECONNREFUSED on some Windows networks
const mongoose = require('mongoose');
module.exports = async function connectDB(uri = process.env.MONGODB_URI) {
  if (!uri) throw new Error('MONGODB_URI is not set (see .env.example)');
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log('MongoDB connected');
};