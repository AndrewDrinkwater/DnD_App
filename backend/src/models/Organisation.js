import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export default class Organisation extends Model {}

Organisation.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: DataTypes.TEXT,
  motto: DataTypes.STRING,
  world_id: { type: DataTypes.UUID, allowNull: false },
  type_id: DataTypes.UUID,
  created_by: DataTypes.UUID,
  created_at: DataTypes.DATE,
  updated_at: DataTypes.DATE
}, {
  sequelize,
  modelName: 'Organisation',
  tableName: 'organisations',
  timestamps: false
});
