import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export default class Character extends Model {}

Character.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: DataTypes.TEXT,
  level: { type: DataTypes.INTEGER, defaultValue: 1 },
  class: DataTypes.STRING,
  stats_json: { type: DataTypes.JSONB, defaultValue: {} },
  user_id: { type: DataTypes.UUID },
  active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  sequelize,
  modelName: 'Character',
  tableName: 'characters',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});
