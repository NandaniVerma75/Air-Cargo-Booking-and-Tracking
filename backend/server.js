import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import routeRoutes from './routes/routeRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import logger from './utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
connectDB();

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'Air Cargo Booking & Tracking API',
    version: '1.0.0',
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/routes', routeRoutes);
app.use('/api/bookings', bookingRoutes);

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`, { port: PORT, env: process.env.NODE_ENV });
  console.log(`Server running on port ${PORT}`);
});

