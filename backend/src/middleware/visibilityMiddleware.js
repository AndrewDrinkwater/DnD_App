import { Op } from 'sequelize';
import {
  Campaign,
  CampaignRole,
  UserCampaignRole
} from '../models/index.js';

const DM_ROLE_NAMES = ['DM', 'Dungeon Master'];
const WORLD_ADMIN_ROLE_NAMES = ['WorldAdmin', 'World Admin'];

const unique = (values) => [...new Set(values.filter(Boolean))];

export const applyVisibilityFilter = (options = {}) => async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const roleNames = (req.user.systemRoles || []).map((role) => role.name);
    const isWorldAdmin = roleNames.some((name) => WORLD_ADMIN_ROLE_NAMES.includes(name));
    const isDm = roleNames.some((name) => DM_ROLE_NAMES.includes(name));

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
      isWorldAdmin,
      isDm,
      bypassVisibility: isWorldAdmin || (isDm && options.dmBypass !== false),
      campaignId,
      characterId,
      worldId,
      playerId: req.user.id,
      managedCampaignIds,
      managedWorldIds,
      worldScope: isWorldAdmin ? null : unique([worldId, ...managedWorldIds].filter(Boolean))
    };

    if (!visibilityContext.bypassVisibility && !visibilityContext.campaignId && !visibilityContext.worldId && !visibilityContext.managedWorldIds.length) {
      visibilityContext.restrictAll = true;
      if (req.method === 'GET' && options.blockWithoutContext) {
        return res.json({ success: true, data: [] });
      }
    }

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
