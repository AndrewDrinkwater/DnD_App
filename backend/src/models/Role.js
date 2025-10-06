import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export default class Role extends Model {}

Role.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  description: { type: DataTypes.STRING }
}, { 
  sequelize, 
  modelName: 'Role', 
  tableName: 'roles', 
  timestamps: true 
});
