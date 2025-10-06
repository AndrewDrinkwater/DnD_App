import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export default class UserCampaignRole extends Model {}

UserCampaignRole.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID },
  campaign_id: { type: DataTypes.UUID },
  campaign_role_id: { type: DataTypes.UUID },
  joined_at: { type: DataTypes.DATE }
}, { sequelize, modelName: 'UserCampaignRole', tableName: 'user_campaign_roles', timestamps: false });
