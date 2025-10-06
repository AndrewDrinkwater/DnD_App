import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';
export default class SystemRole extends Model {}
SystemRole.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: DataTypes.STRING,
  description: DataTypes.STRING
}, { sequelize, modelName: 'SystemRole', tableName: 'system_roles', timestamps: false });
