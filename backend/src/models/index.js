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
import Race from './Race.js';
import LocationType from './LocationType.js';
import Location from './Location.js';
import LocationVisibility from './LocationVisibility.js';
import OrganisationType from './OrganisationType.js';
import Organisation from './Organisation.js';
import OrganisationVisibility from './OrganisationVisibility.js';
import OrganisationLocation from './OrganisationLocation.js';
import OrganisationRelationship from './OrganisationRelationship.js';
import NpcType from './NpcType.js';
import Npc from './Npc.js';
import NpcVisibility from './NpcVisibility.js';
import NpcNote from './NpcNote.js';
import NpcRelationship from './NpcRelationship.js';

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

World.hasMany(Location, { as: 'locations', foreignKey: 'world_id' });
Location.belongsTo(World, { as: 'world', foreignKey: 'world_id' });
Location.belongsTo(LocationType, { as: 'type', foreignKey: 'type_id' });
Location.belongsTo(User, { as: 'creator', foreignKey: 'created_by' });
Location.hasMany(LocationVisibility, { as: 'visibility', foreignKey: 'location_id' });
LocationVisibility.belongsTo(Location, { as: 'location', foreignKey: 'location_id' });
LocationVisibility.belongsTo(Campaign, { as: 'campaign', foreignKey: 'campaign_id' });
LocationVisibility.belongsTo(User, { as: 'player', foreignKey: 'player_id' });

World.hasMany(Organisation, { as: 'organisations', foreignKey: 'world_id' });
Organisation.belongsTo(World, { as: 'world', foreignKey: 'world_id' });
Organisation.belongsTo(OrganisationType, { as: 'type', foreignKey: 'type_id' });
Organisation.belongsTo(User, { as: 'creator', foreignKey: 'created_by' });
Organisation.hasMany(OrganisationVisibility, { as: 'visibility', foreignKey: 'organisation_id' });
OrganisationVisibility.belongsTo(Organisation, { as: 'organisation', foreignKey: 'organisation_id' });
OrganisationVisibility.belongsTo(Campaign, { as: 'campaign', foreignKey: 'campaign_id' });
OrganisationVisibility.belongsTo(User, { as: 'player', foreignKey: 'player_id' });
Organisation.belongsToMany(Location, {
  through: OrganisationLocation,
  as: 'locations',
  foreignKey: 'organisation_id',
  otherKey: 'location_id'
});
Location.belongsToMany(Organisation, {
  through: OrganisationLocation,
  as: 'organisations',
  foreignKey: 'location_id',
  otherKey: 'organisation_id'
});
OrganisationRelationship.belongsTo(Organisation, { as: 'organisation', foreignKey: 'organisation_id' });
OrganisationRelationship.belongsTo(Organisation, { as: 'relatedOrganisation', foreignKey: 'related_organisation_id' });
Organisation.hasMany(OrganisationRelationship, { as: 'relationships', foreignKey: 'organisation_id' });

Race.hasMany(Npc, { as: 'npcs', foreignKey: 'race_id' });
Npc.belongsTo(Race, { as: 'race', foreignKey: 'race_id' });
Npc.belongsTo(World, { as: 'world', foreignKey: 'world_id' });
Npc.belongsTo(NpcType, { as: 'type', foreignKey: 'type_id' });
Npc.belongsTo(User, { as: 'creator', foreignKey: 'created_by' });
Npc.hasMany(NpcVisibility, { as: 'visibility', foreignKey: 'npc_id' });
NpcVisibility.belongsTo(Npc, { as: 'npc', foreignKey: 'npc_id' });
NpcVisibility.belongsTo(Campaign, { as: 'campaign', foreignKey: 'campaign_id' });
NpcVisibility.belongsTo(User, { as: 'player', foreignKey: 'player_id' });
Npc.hasMany(NpcNote, { as: 'notes', foreignKey: 'npc_id' });
NpcNote.belongsTo(Npc, { as: 'npc', foreignKey: 'npc_id' });
NpcNote.belongsTo(User, { as: 'author', foreignKey: 'author_id' });
Npc.hasMany(NpcRelationship, { as: 'relationships', foreignKey: 'npc_id' });
NpcRelationship.belongsTo(Npc, { as: 'npc', foreignKey: 'npc_id' });
NpcRelationship.belongsTo(Npc, { as: 'relatedNpc', foreignKey: 'related_npc_id' });

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
  CharacterCampaign,
  Race,
  LocationType,
  Location,
  LocationVisibility,
  OrganisationType,
  Organisation,
  OrganisationVisibility,
  OrganisationLocation,
  OrganisationRelationship,
  NpcType,
  Npc,
  NpcVisibility,
  NpcNote,
  NpcRelationship
};
