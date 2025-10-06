import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';
import User from './User.js';
export default class Character extends Model {}
Character.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: DataTypes.STRING,
  description: DataTypes.TEXT,
  level: { type: DataTypes.INTEGER, defaultValue: 1 },
  class: DataTypes.STRING,
  stats_json: { type: DataTypes.JSONB, defaultValue: {} },
  active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { sequelize, modelName: 'Character', tableName: 'characters', timestamps: true });

Character.belongsTo(User, { foreignKey: 'user_id' });
