import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export default class CharacterCampaign extends Model {}

CharacterCampaign.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  character_id: { type: DataTypes.UUID },
  campaign_id: { type: DataTypes.UUID },
  joined_at: { type: DataTypes.DATE }
}, { sequelize, modelName: 'CharacterCampaign', tableName: 'character_campaigns', timestamps: false });
