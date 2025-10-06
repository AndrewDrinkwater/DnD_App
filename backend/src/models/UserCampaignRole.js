import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';
export default class UserCampaignRole extends Model {}
UserCampaignRole.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true }
}, { sequelize, modelName: 'UserCampaignRole', tableName: 'user_campaign_roles', timestamps: false });
