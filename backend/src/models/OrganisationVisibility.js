import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export default class OrganisationVisibility extends Model {}

OrganisationVisibility.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organisation_id: { type: DataTypes.UUID, allowNull: false },
  campaign_id: DataTypes.UUID,
  player_id: DataTypes.UUID,
  created_at: DataTypes.DATE
}, {
  sequelize,
  modelName: 'OrganisationVisibility',
  tableName: 'organisation_visibility',
  timestamps: false
});
