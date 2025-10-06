import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';
import World from './World.js';
import User from './User.js';
export default class Campaign extends Model {}
Campaign.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: DataTypes.STRING,
  description: DataTypes.TEXT
}, { sequelize, modelName: 'Campaign', tableName: 'campaigns', timestamps: true });

Campaign.belongsTo(World, { foreignKey: 'world_id' });
Campaign.belongsTo(User, { as: 'creator', foreignKey: 'created_by' });
