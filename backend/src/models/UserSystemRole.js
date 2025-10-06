import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';
import User from './User.js';
import SystemRole from './SystemRole.js';
export default class UserSystemRole extends Model {}
UserSystemRole.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true }
}, { sequelize, modelName: 'UserSystemRole', tableName: 'user_system_roles', timestamps: false });

User.belongsToMany(SystemRole, { through: UserSystemRole, foreignKey: 'user_id' });
SystemRole.belongsToMany(User, { through: UserSystemRole, foreignKey: 'system_role_id' });
