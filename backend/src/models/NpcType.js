import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export default class NpcType extends Model {}

NpcType.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: DataTypes.TEXT,
  created_at: DataTypes.DATE
}, {
  sequelize,
  modelName: 'NpcType',
  tableName: 'npc_types',
  timestamps: false
});
