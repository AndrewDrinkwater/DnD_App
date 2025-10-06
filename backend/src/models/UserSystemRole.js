import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export default class UserSystemRole extends Model {}

UserSystemRole.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID },
  system_role_id: { type: DataTypes.UUID },
  assigned_at: { type: DataTypes.DATE }
}, { sequelize, modelName: 'UserSystemRole', tableName: 'user_system_roles', timestamps: false });
