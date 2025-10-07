import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export default class Npc extends Model {}

Npc.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: DataTypes.TEXT,
  demeanor: DataTypes.STRING,
  world_id: { type: DataTypes.UUID, allowNull: false },
  race_id: DataTypes.UUID,
  type_id: DataTypes.UUID,
  created_by: DataTypes.UUID,
  created_at: DataTypes.DATE,
  updated_at: DataTypes.DATE
}, {
  sequelize,
  modelName: 'Npc',
  tableName: 'npcs',
  timestamps: false
});
