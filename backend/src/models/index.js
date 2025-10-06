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

User.hasMany(Character, { as: 'characters', foreignKey: 'user_id' });
Character.belongsTo(User, { as: 'owner', foreignKey: 'user_id' });

World.hasMany(Campaign, { as: 'campaigns', foreignKey: 'world_id' });
Campaign.belongsTo(World, { as: 'world', foreignKey: 'world_id' });

User.hasMany(Campaign, { as: 'createdCampaigns', foreignKey: 'created_by' });
Campaign.belongsTo(User, { as: 'creator', foreignKey: 'created_by' });

User.belongsToMany(SystemRole, {
  through: UserSystemRole,
  as: 'systemRoles',
  foreignKey: 'user_id',
  otherKey: 'system_role_id'
});
SystemRole.belongsToMany(User, {
  through: UserSystemRole,
  as: 'users',
  foreignKey: 'system_role_id',
  otherKey: 'user_id'
});
UserSystemRole.belongsTo(User, { as: 'user', foreignKey: 'user_id' });
UserSystemRole.belongsTo(SystemRole, { as: 'systemRole', foreignKey: 'system_role_id' });
User.hasMany(UserSystemRole, { as: 'userSystemRoles', foreignKey: 'user_id' });
SystemRole.hasMany(UserSystemRole, { as: 'userSystemRoles', foreignKey: 'system_role_id' });

Campaign.hasMany(CampaignRole, { as: 'roles', foreignKey: 'campaign_id' });
CampaignRole.belongsTo(Campaign, { as: 'campaign', foreignKey: 'campaign_id' });

User.belongsToMany(Campaign, {
  through: UserCampaignRole,
  as: 'campaigns',
  foreignKey: 'user_id',
  otherKey: 'campaign_id'
});
Campaign.belongsToMany(User, {
  through: UserCampaignRole,
  as: 'users',
  foreignKey: 'campaign_id',
  otherKey: 'user_id'
});
User.belongsToMany(CampaignRole, {
  through: UserCampaignRole,
  as: 'campaignRoles',
  foreignKey: 'user_id',
  otherKey: 'campaign_role_id'
});
CampaignRole.belongsToMany(User, {
  through: UserCampaignRole,
  as: 'users',
  foreignKey: 'campaign_role_id',
  otherKey: 'user_id'
});
UserCampaignRole.belongsTo(User, { as: 'user', foreignKey: 'user_id' });
UserCampaignRole.belongsTo(Campaign, { as: 'campaign', foreignKey: 'campaign_id' });
UserCampaignRole.belongsTo(CampaignRole, { as: 'role', foreignKey: 'campaign_role_id' });
User.hasMany(UserCampaignRole, { as: 'userCampaignRoles', foreignKey: 'user_id' });
Campaign.hasMany(UserCampaignRole, { as: 'userCampaignRoles', foreignKey: 'campaign_id' });
CampaignRole.hasMany(UserCampaignRole, { as: 'userCampaignRoles', foreignKey: 'campaign_role_id' });

Character.belongsToMany(Campaign, {
  through: CharacterCampaign,
  as: 'campaigns',
  foreignKey: 'character_id',
  otherKey: 'campaign_id'
});
Campaign.belongsToMany(Character, {
  through: CharacterCampaign,
  as: 'characters',
  foreignKey: 'campaign_id',
  otherKey: 'character_id'
});
CharacterCampaign.belongsTo(Character, { as: 'character', foreignKey: 'character_id' });
CharacterCampaign.belongsTo(Campaign, { as: 'campaign', foreignKey: 'campaign_id' });
Character.hasMany(CharacterCampaign, { as: 'characterCampaigns', foreignKey: 'character_id' });
Campaign.hasMany(CharacterCampaign, { as: 'characterCampaigns', foreignKey: 'campaign_id' });

export {
  sequelize,
  User,
  SystemRole,
  UserSystemRole,
  World,
  Campaign,
  CampaignRole,
  UserCampaignRole,
  Character,
  CharacterCampaign
};
