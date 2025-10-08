import {
  Location,
  LocationType,
  LocationVisibility,
  Organisation,

  Campaign,
  User
} from '../models/index.js';
import {
  applyWorldScope,
  buildVisibilityInclude,
  normalizeVisibilityEntries,
  resolveDefaultVisibility,
  syncVisibilityEntries
} from '../utils/visibility.js';

const locationIncludes = (context) => ([
  { model: LocationType, as: 'type' },
  {
    model: Organisation,
    as: 'organisations',
    through: { attributes: [] }
  },
  buildVisibilityInclude({
    context,
    model: LocationVisibility,
    as: 'visibility',
    include: [
      { model: Campaign, as: 'campaign', attributes: ['id', 'name'] },
      { model: User, as: 'player', attributes: ['id', 'username'] }
    ]
  })
]);

const ensurePrivileged = (context) => {
  if (!context) return false;
  return context.isSystemAdmin || context.isWorldAdmin || context.isDm;
};

const loadLocation = async (id, context) => {
  return Location.findByPk(id, {
    include: locationIncludes(context)
  });
};

export const listLocations = async (req, res) => {
  try {
    const context = req.visibilityContext;
    if (context?.restrictAll && !context?.bypassVisibility) {
      return res.json({ success: true, data: [] });
    }

    const where = applyWorldScope({}, context);

    const locations = await Location.findAll({
      where,
      include: locationIncludes(context),
      order: [['name', 'ASC']],
      distinct: true
    });

    res.json({ success: true, data: locations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getLocation = async (req, res) => {
  try {
    const context = req.visibilityContext;
    const location = await loadLocation(req.params.id, context);
    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }

    if (!context?.bypassVisibility) {
      const visibilityMatches = location.visibility?.some((entry) => {
        if (entry.campaign_id && context?.campaignId && entry.campaign_id === context.campaignId) return true;
        if (entry.player_id && entry.player_id === context?.playerId) return true;
        return entry.campaign_id === null && entry.player_id === null;
      });
      if (!visibilityMatches) {
        return res.status(403).json({ success: false, message: 'Location is not visible in this context' });
      }
    }

    res.json({ success: true, data: location });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createLocation = async (req, res) => {
  try {
    const context = req.visibilityContext;
    if (!ensurePrivileged(context)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions to create locations' });
    }

    const { name, description, summary, worldId, typeId, visibility } = req.body;
    const effectiveWorldId = worldId || context?.worldId || context?.worldScope?.[0];

    if (!name) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }
    if (!effectiveWorldId) {
      return res.status(400).json({ success: false, message: 'worldId is required for locations' });
    }

    const location = await Location.create({
      name,
      description,
      summary,
      world_id: effectiveWorldId,
      type_id: typeId || null,
      created_by: req.user.id,
      created_at: new Date(),
      updated_at: new Date()
    });

    const visibilityEntries = normalizeVisibilityEntries(visibility?.length ? visibility : resolveDefaultVisibility(context));
    if (visibilityEntries.length) {
      await syncVisibilityEntries(LocationVisibility, 'location_id', location.id, visibilityEntries);
    }

    const hydrated = await loadLocation(location.id, context);
    res.status(201).json({ success: true, data: hydrated, message: 'Location created' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateLocation = async (req, res) => {
  try {
    const context = req.visibilityContext;
    if (!ensurePrivileged(context)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions to update locations' });
    }

    const location = await Location.findByPk(req.params.id);
    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }

    const { name, description, summary, typeId, worldId, visibility } = req.body;

    if (typeof name !== 'undefined') location.name = name;
    if (typeof description !== 'undefined') location.description = description;
    if (typeof summary !== 'undefined') location.summary = summary;
    if (typeof typeId !== 'undefined') location.type_id = typeId || null;
    if (typeof worldId !== 'undefined') location.world_id = worldId || location.world_id;
    location.updated_at = new Date();

    await location.save();

    if (visibility) {
      await syncVisibilityEntries(LocationVisibility, 'location_id', location.id, visibility);
    }

    const hydrated = await loadLocation(location.id, context);
    res.json({ success: true, data: hydrated, message: 'Location updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteLocation = async (req, res) => {
  try {
    const context = req.visibilityContext;
    if (!ensurePrivileged(context)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions to delete locations' });
    }

    const location = await Location.findByPk(req.params.id);
    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }

    await location.destroy();
    res.json({ success: true, data: null, message: 'Location deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const listLocationTypes = async (_req, res) => {
  try {
    const types = await LocationType.findAll({ order: [['name', 'ASC']] });
    res.json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createLocationType = async (req, res) => {
  try {
    const context = req.visibilityContext;
    if (!context?.isWorldAdmin && !context?.isSystemAdmin) {
      return res.status(403).json({ success: false, message: 'Only world admins may manage location types' });
    }

    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }

    const type = await LocationType.create({ name, description, created_at: new Date() });
    res.status(201).json({ success: true, data: type, message: 'Location type created' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateLocationType = async (req, res) => {
  try {
    const context = req.visibilityContext;
    if (!context?.isWorldAdmin && !context?.isSystemAdmin) {
      return res.status(403).json({ success: false, message: 'Only world admins may manage location types' });
    }

    const type = await LocationType.findByPk(req.params.id);
    if (!type) {
      return res.status(404).json({ success: false, message: 'Location type not found' });
    }

    const { name, description } = req.body;
    if (typeof name !== 'undefined') type.name = name;
    if (typeof description !== 'undefined') type.description = description;
    await type.save();

    res.json({ success: true, data: type, message: 'Location type updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteLocationType = async (req, res) => {
  try {
    const context = req.visibilityContext;
    if (!context?.isWorldAdmin && !context?.isSystemAdmin) {
      return res.status(403).json({ success: false, message: 'Only world admins may manage location types' });
    }

    const type = await LocationType.findByPk(req.params.id);
    if (!type) {
      return res.status(404).json({ success: false, message: 'Location type not found' });
    }

    await type.destroy();
    res.json({ success: true, data: null, message: 'Location type deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
