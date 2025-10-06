import express from 'express';
import cors from 'cors';
import { sequelize } from './models/index.js';
import { cfg } from './config/env.js';
import apiRoutes from './routes/index.js';
import authRoutes from './routes/authRoutes.js';
import { authenticateToken } from './middleware/authMiddleware.js';

const app = express();

// --- CORS configuration ---
const allowedOrigins = [
  'http://localhost:5173',        // Vite dev server
  'http://127.0.0.1:5173'         // Sometimes Vite uses this instead
];

// Allow only known origins in dev, and handle prod automatically
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`Blocked CORS request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

// --- Core middleware ---
app.use(express.json());

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api', authenticateToken, apiRoutes);

app.get('/', (req, res) => res.send('DnD_app backend running'));

// --- Error handler ---
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ success: false, message: err.message });
});

// --- Server startup ---
(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    app.listen(cfg.port, () =>
      console.log(`🚀 Server running on port ${cfg.port}`)
    );
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  }
})();
