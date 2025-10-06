import { Sequelize } from 'sequelize';
import { cfg } from './env.js';

export const sequelize = new Sequelize(cfg.dbUrl, {
  dialect: 'postgres',
  logging: false
});
