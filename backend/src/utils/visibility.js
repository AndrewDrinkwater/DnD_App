import { Op } from 'sequelize';

export const normalizeVisibilityEntries = (entries = []) => {
  const seen = new Set();
  return entries
    .map((entry) => ({
      campaign_id: entry?.campaignId ?? entry?.campaign_id ?? null,
      player_id: entry?.playerId ?? entry?.player_id ?? null
    }))
    .filter((entry) => {
      const key = `${entry.campaign_id || 'null'}:${entry.player_id || 'null'}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
};

export const resolveDefaultVisibility = (context) => {
  if (!context) return [];
  if (context.isWorldAdmin) {
    return [{ campaign_id: null, player_id: null }];
  }
  if (context.campaignId) {
    return [{ campaign_id: context.campaignId, player_id: null }];
  }
  if (context.managedCampaignIds?.length) {
    return context.managedCampaignIds.map((campaignId) => ({ campaign_id: campaignId, player_id: null }));
  }
  return context.playerId ? [{ campaign_id: null, player_id: context.playerId }] : [];
};

export const syncVisibilityEntries = async (Model, keyName, entityId, entries = []) => {
  const normalized = normalizeVisibilityEntries(entries);
  await Model.destroy({ where: { [keyName]: entityId } });
  if (normalized.length === 0) {
    return [];
  }
  const created = await Model.bulkCreate(normalized.map((entry) => ({
    [keyName]: entityId,
    campaign_id: entry.campaign_id,
    player_id: entry.player_id
  })), { returning: true });
  return created;
};

export const buildVisibilityInclude = ({
  context,
  model,
  as,
  include = []
}) => {
  const visibilityInclude = {
    model,
    as,
    include,
    required: false
  };

  if (context?.bypassVisibility) {
    return visibilityInclude;
  }

  const conditions = [];
  if (context?.campaignId) {
    conditions.push({ campaign_id: context.campaignId });
  }
  if (context?.playerId) {
    conditions.push({ player_id: context.playerId });
  }
  conditions.push({ campaign_id: null, player_id: null });

  visibilityInclude.where = { [Op.or]: conditions };
  visibilityInclude.required = true;
  return visibilityInclude;
};

export const applyWorldScope = (where = {}, context, field = 'world_id') => {
  if (!context) return where;
  if (context.bypassVisibility) {
    if (context.worldScope?.length) {
      return { ...where, [field]: context.worldScope.length === 1 ? context.worldScope[0] : { [Op.in]: context.worldScope } };
    }
    return where;
  }

  if (context.worldScope?.length) {
    return { ...where, [field]: context.worldScope.length === 1 ? context.worldScope[0] : { [Op.in]: context.worldScope } };
  }

  if (context.worldId) {
    return { ...where, [field]: context.worldId };
  }

  return where;
};
