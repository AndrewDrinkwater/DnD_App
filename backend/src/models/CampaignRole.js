import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export default class CampaignRole extends Model {}

CampaignRole.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: DataTypes.STRING,
  campaign_id: { type: DataTypes.UUID }
}, { sequelize, modelName: 'CampaignRole', tableName: 'campaign_roles', timestamps: false });
