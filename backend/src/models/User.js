import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export default class User extends Model {}
User.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password_hash: { type: DataTypes.STRING, allowNull: false },
  active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { sequelize, modelName: 'User', tableName: 'users', timestamps: true });
