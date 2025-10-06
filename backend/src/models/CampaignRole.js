import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';
import Campaign from './Campaign.js';
export default class CampaignRole extends Model {}
CampaignRole.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: DataTypes.STRING,
  description: DataTypes.STRING
}, { sequelize, modelName: 'CampaignRole', tableName: 'campaign_roles', timestamps: false });

CampaignRole.belongsTo(Campaign, { foreignKey: 'campaign_id' });
