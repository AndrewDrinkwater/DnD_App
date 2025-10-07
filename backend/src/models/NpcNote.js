import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export default class NpcNote extends Model {}

NpcNote.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  npc_id: { type: DataTypes.UUID, allowNull: false },
  author_id: DataTypes.UUID,
  content: { type: DataTypes.TEXT, allowNull: false },
  visibility_level: { type: DataTypes.ENUM('Private', 'Party', 'DM'), allowNull: false, defaultValue: 'Private' },
  created_at: DataTypes.DATE,
  updated_at: DataTypes.DATE
}, {
  sequelize,
  modelName: 'NpcNote',
  tableName: 'npc_notes',
  timestamps: false
});
