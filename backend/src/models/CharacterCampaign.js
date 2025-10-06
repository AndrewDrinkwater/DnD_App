import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';
export default class CharacterCampaign extends Model {}
CharacterCampaign.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true }
}, { sequelize, modelName: 'CharacterCampaign', tableName: 'character_campaigns', timestamps: false });
