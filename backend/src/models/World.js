import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';
export default class World extends Model {}
World.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: DataTypes.STRING,
  description: DataTypes.TEXT
}, { sequelize, modelName: 'World', tableName: 'worlds', timestamps: false });
