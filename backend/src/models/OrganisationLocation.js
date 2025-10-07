import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export default class OrganisationLocation extends Model {}

OrganisationLocation.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organisation_id: { type: DataTypes.UUID, allowNull: false },
  location_id: { type: DataTypes.UUID, allowNull: false },
  created_at: DataTypes.DATE
}, {
  sequelize,
  modelName: 'OrganisationLocation',
  tableName: 'organisation_locations',
  timestamps: false
});
