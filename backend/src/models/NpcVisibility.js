import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export default class NpcVisibility extends Model {}

NpcVisibility.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  npc_id: { type: DataTypes.UUID, allowNull: false },
  campaign_id: DataTypes.UUID,
  player_id: DataTypes.UUID,
  created_at: DataTypes.DATE
}, {
  sequelize,
  modelName: 'NpcVisibility',
  tableName: 'npc_visibility',
  timestamps: false
});
