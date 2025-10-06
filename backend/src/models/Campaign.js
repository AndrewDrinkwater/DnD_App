import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export default class Campaign extends Model {}

Campaign.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: DataTypes.TEXT,
  created_by: { type: DataTypes.UUID },
  world_id: { type: DataTypes.UUID }
}, {
  sequelize,
  modelName: 'Campaign',
  tableName: 'campaigns',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});
