import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export default class World extends Model {}

World.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: DataTypes.TEXT,
  created_by: { type: DataTypes.UUID },
  created_at: { type: DataTypes.DATE }
}, { sequelize, modelName: 'World', tableName: 'worlds', timestamps: false });
