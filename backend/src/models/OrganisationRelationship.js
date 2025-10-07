import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export default class OrganisationRelationship extends Model {}

OrganisationRelationship.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organisation_id: { type: DataTypes.UUID, allowNull: false },
  related_organisation_id: { type: DataTypes.UUID, allowNull: false },
  relationship_type: DataTypes.STRING,
  description: DataTypes.TEXT,
  created_at: DataTypes.DATE
}, {
  sequelize,
  modelName: 'OrganisationRelationship',
  tableName: 'organisation_relationships',
  timestamps: false
});
