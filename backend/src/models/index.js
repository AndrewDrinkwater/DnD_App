import { sequelize } from '../config/db.js';
import User from './User.js';
import SystemRole from './SystemRole.js';
import UserSystemRole from './UserSystemRole.js';
import World from './World.js';
import Campaign from './Campaign.js';
import CampaignRole from './CampaignRole.js';
import UserCampaignRole from './UserCampaignRole.js';
import Character from './Character.js';
import CharacterCampaign from './CharacterCampaign.js';

export {
  sequelize,
  User, SystemRole, UserSystemRole,
  World, Campaign, CampaignRole, UserCampaignRole,
  Character, CharacterCampaign
};
