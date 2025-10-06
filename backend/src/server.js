import express from 'express';
import { sequelize } from './models/index.js';
import { cfg } from './config/env.js';
import apiRoutes from './routes/index.js';

const app = express();
app.use(express.json());

app.use('/api', apiRoutes);

app.get('/', (req, res) => res.send('DnD_app backend running'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: err.message });
});

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    app.listen(cfg.port, () => console.log(`Server running on port ${cfg.port}`));
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  }
})();
