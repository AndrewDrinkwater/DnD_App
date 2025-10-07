import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export default class NpcRelationship extends Model {}

NpcRelationship.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  npc_id: { type: DataTypes.UUID, allowNull: false },
  related_npc_id: { type: DataTypes.UUID, allowNull: false },
  relationship_type: DataTypes.STRING,
  description: DataTypes.TEXT,
  created_at: DataTypes.DATE
}, {
  sequelize,
  modelName: 'NpcRelationship',
  tableName: 'npc_relationships',
  timestamps: false
});
