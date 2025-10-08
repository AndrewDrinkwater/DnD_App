import { Op } from 'sequelize';
import {
  Campaign,
  CampaignRole,
  UserCampaignRole
} from '../models/index.js';

const toLower = (value) => (typeof value === 'string' ? value.toLowerCase() : value);

const DM_ROLE_NAMES = ['DM', 'Dungeon Master'];
const WORLD_ADMIN_ROLE_NAMES = ['WorldAdmin', 'World Admin'];
const SYSTEM_ADMIN_ROLE_NAMES = ['System Admin', 'System Administrator', 'Admin'];

const DM_ROLE_NAMES_LOWER = DM_ROLE_NAMES.map(toLower);
const WORLD_ADMIN_ROLE_NAMES_LOWER = WORLD_ADMIN_ROLE_NAMES.map(toLower);
const SYSTEM_ADMIN_ROLE_NAMES_LOWER = SYSTEM_ADMIN_ROLE_NAMES.map(toLower);

const normalizeRoleNames = (names = []) => names.map(toLower).filter(Boolean);

const unique = (values) => [...new Set(values.filter(Boolean))];

export const applyVisibilityFilter = (options = {}) => async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const rawRoleNames = (req.user.systemRoles || []).map((role) => role.name || role);
    const roleNames = unique(rawRoleNames);
    const normalizedRoleNames = normalizeRoleNames(roleNames);
    const isSystemAdmin = normalizedRoleNames.some((name) =>
      SYSTEM_ADMIN_ROLE_NAMES_LOWER.includes(name)
    );
    const isWorldAdmin = normalizedRoleNames.some((name) =>
      WORLD_ADMIN_ROLE_NAMES_LOWER.includes(name)
    );
    const isDm = normalizedRoleNames.some((name) => DM_ROLE_NAMES_LOWER.includes(name));

    const context = req.activeContext || {};
    let { campaignId = null, worldId = null, characterId = null } = context;

    if (campaignId && !worldId) {
      const campaign = await Campaign.findByPk(campaignId, { attributes: ['id', 'world_id'] });
      worldId = campaign?.world_id || null;
    }

    let managedCampaignIds = [];
    let managedWorldIds = [];

    if (isDm) {
      const dmAssignments = await UserCampaignRole.findAll({
        where: { user_id: req.user.id },
        include: [
          {
            model: CampaignRole,
            as: 'role',
            where: { name: { [Op.in]: DM_ROLE_NAMES } },
            attributes: ['id', 'name']
          },
          {
            model: Campaign,
            as: 'campaign',
            attributes: ['id', 'world_id']
          }
        ]
      });

      managedCampaignIds = unique(dmAssignments.map((assignment) => assignment.campaign?.id || assignment.campaign_id));
      managedWorldIds = unique(dmAssignments.map((assignment) => assignment.campaign?.world_id));
    }

    const visibilityContext = {
      roleNames,
      isSystemAdmin,
      isWorldAdmin,
      isDm,
      bypassVisibility: true,
      campaignId,
      characterId,
      worldId,
      playerId: req.user.id,
      managedCampaignIds,
      managedWorldIds,
      worldScope: null
    };

    visibilityContext.restrictAll = false;

    if (options.requireVisibilityForWrite && req.method !== 'GET' && !visibilityContext.bypassVisibility) {
      if (!visibilityContext.campaignId && !visibilityContext.playerId) {
        return res.status(403).json({ success: false, message: 'Active campaign context is required for this action' });
      }
    }

    req.visibilityContext = visibilityContext;
    next();
  } catch (error) {
    next(error);
  }
};
