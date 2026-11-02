import 'dotenv/config';
import dns from 'node:dns';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import caseRoutes from './routes/caseRoutes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
  console.log('Node DNS resolver set to Google Public DNS.');
} catch (err) {
  console.warn('Could not override Node DNS servers; keeping the system resolver:', err.message);
}

const app = express();
const allowedOrigins = new Set([
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173'
].filter(Boolean));
app.use(cors({ origin(origin, callback) {
  if (!origin || allowedOrigins.has(origin)) return callback(null, true);
  return callback(new Error('Origin is not allowed by CORS.'));
} }));
app.use(express.json({ limit: '20kb' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));
app.use('/api/cases', (req, res, next) => {
  if (mongoose.connection.readyState === 1) return next();
  return res.status(503).json({ error: process.env.MONGODB_URI ? 'MongoDB is not connected. Check MONGODB_URI and database network access.' : 'MongoDB is not configured. Set MONGODB_URI in server/.env.' });
});
app.use('/api/cases', caseRoutes); app.use(notFound); app.use(errorHandler);
const port = process.env.PORT || 4000;
if (process.env.MONGODB_URI) mongoose.connect(process.env.MONGODB_URI).then(() => console.log('MongoDB connected')).catch(err => console.error('MongoDB connection failed:', err.message));
else console.warn('MONGODB_URI is not set. Configure server/.env to enable case persistence.');
app.listen(port, () => console.log(`AI Mystery API listening on ${port}`));
