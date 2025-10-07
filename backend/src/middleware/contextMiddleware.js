const normalizeId = (value) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
};

export const attachContext = (req, _res, next) => {
  const headers = req.headers || {};
  const campaignId = normalizeId(headers['x-active-campaign'] || headers['x-campaign-id'] || headers['x-campaign'] || req.query?.campaignId || req.body?.campaignId);
  const characterId = normalizeId(headers['x-active-character'] || headers['x-character-id'] || req.query?.characterId || req.body?.characterId);
  const worldId = normalizeId(headers['x-active-world'] || headers['x-world-id'] || req.query?.worldId || req.body?.worldId);

  req.activeContext = {
    campaignId,
    characterId,
    worldId
  };
  next();
};
