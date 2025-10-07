import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export default class LocationVisibility extends Model {}

LocationVisibility.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  location_id: { type: DataTypes.UUID, allowNull: false },
  campaign_id: DataTypes.UUID,
  player_id: DataTypes.UUID,
  created_at: DataTypes.DATE
}, {
  sequelize,
  modelName: 'LocationVisibility',
  tableName: 'location_visibility',
  timestamps: false
});
