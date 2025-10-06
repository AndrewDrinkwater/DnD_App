import express from 'express';
import { sequelize } from './models/index.js';
import { cfg } from './config/env.js';

const app = express();
app.use(express.json());

// simple route
app.get('/', (req, res) => res.send('DnD_app backend running'));

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    app.listen(cfg.port, () => console.log(`Server running on port ${cfg.port}`));
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  }
})();
