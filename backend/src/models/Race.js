import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export default class Race extends Model {}

Race.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: DataTypes.TEXT,
  created_by: DataTypes.UUID,
  created_at: DataTypes.DATE
}, {
  sequelize,
  modelName: 'Race',
  tableName: 'races',
  timestamps: false
});
