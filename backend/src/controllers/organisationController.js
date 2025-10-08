import {
  Organisation,
  OrganisationType,
  OrganisationVisibility,
  OrganisationLocation,
  OrganisationRelationship,
  Location,
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

const organisationIncludes = (context) => ([
  { model: OrganisationType, as: 'type' },
  {
    model: Location,
    as: 'locations',
    through: { attributes: [] }
  },
  {
    model: OrganisationRelationship,
    as: 'relationships',
    include: [
      { model: Organisation, as: 'relatedOrganisation', attributes: ['id', 'name'] }
    ]
  },
  buildVisibilityInclude({
    context,
    model: OrganisationVisibility,
    as: 'visibility',
    include: [
      { model: Campaign, as: 'campaign', attributes: ['id', 'name'] },
      { model: User, as: 'player', attributes: ['id', 'username'] }
    ]
  })
]);

const ensurePrivileged = (context) => context?.isSystemAdmin || context?.isWorldAdmin || context?.isDm;

const loadOrganisation = async (id, context) => Organisation.findByPk(id, {
  include: organisationIncludes(context)
});

export const listOrganisations = async (req, res) => {
  try {
    const context = req.visibilityContext;
    if (context?.restrictAll && !context?.bypassVisibility) {
      return res.json({ success: true, data: [] });
    }

    const where = applyWorldScope({}, context);
    const organisations = await Organisation.findAll({
      where,
      include: organisationIncludes(context),
      order: [['name', 'ASC']],
      distinct: true
    });

    res.json({ success: true, data: organisations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOrganisation = async (req, res) => {
  try {
    const context = req.visibilityContext;
    const organisation = await loadOrganisation(req.params.id, context);
    if (!organisation) {
      return res.status(404).json({ success: false, message: 'Organisation not found' });
    }

    if (!context?.bypassVisibility) {
      const visible = organisation.visibility?.some((entry) => {
        if (entry.campaign_id && context?.campaignId && entry.campaign_id === context.campaignId) return true;
        if (entry.player_id && entry.player_id === context?.playerId) return true;
        return entry.campaign_id === null && entry.player_id === null;
      });
      if (!visible) {
        return res.status(403).json({ success: false, message: 'Organisation is not visible in this context' });
      }
    }

    res.json({ success: true, data: organisation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createOrganisation = async (req, res) => {
  try {
    const context = req.visibilityContext;
    if (!ensurePrivileged(context)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions to create organisations' });
    }

    const { name, description, motto, worldId, typeId, visibility, locationIds = [] } = req.body;
    const effectiveWorldId = worldId || context?.worldId || context?.worldScope?.[0];

    if (!name) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }
    if (!effectiveWorldId) {
      return res.status(400).json({ success: false, message: 'worldId is required for organisations' });
    }

    const organisation = await Organisation.create({
      name,
      description,
      motto,
      world_id: effectiveWorldId,
      type_id: typeId || null,
      created_by: req.user.id,
      created_at: new Date(),
      updated_at: new Date()
    });

    if (locationIds.length) {
      const assignments = locationIds.map((locationId) => ({ organisation_id: organisation.id, location_id: locationId }));
      await OrganisationLocation.bulkCreate(assignments, { ignoreDuplicates: true });
    }

    const visibilityEntries = normalizeVisibilityEntries(visibility?.length ? visibility : resolveDefaultVisibility(context));
    if (visibilityEntries.length) {
      await syncVisibilityEntries(OrganisationVisibility, 'organisation_id', organisation.id, visibilityEntries);
    }

    const hydrated = await loadOrganisation(organisation.id, context);
    res.status(201).json({ success: true, data: hydrated, message: 'Organisation created' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOrganisation = async (req, res) => {
  try {
    const context = req.visibilityContext;
    if (!ensurePrivileged(context)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions to update organisations' });
    }

    const organisation = await Organisation.findByPk(req.params.id);
    if (!organisation) {
      return res.status(404).json({ success: false, message: 'Organisation not found' });
    }

    const { name, description, motto, worldId, typeId, visibility, locationIds } = req.body;

    if (typeof name !== 'undefined') organisation.name = name;
    if (typeof description !== 'undefined') organisation.description = description;
    if (typeof motto !== 'undefined') organisation.motto = motto;
    if (typeof worldId !== 'undefined') organisation.world_id = worldId || organisation.world_id;
    if (typeof typeId !== 'undefined') organisation.type_id = typeId || null;
    organisation.updated_at = new Date();

    await organisation.save();

    if (Array.isArray(locationIds)) {
      await OrganisationLocation.destroy({ where: { organisation_id: organisation.id } });
      if (locationIds.length) {
        await OrganisationLocation.bulkCreate(locationIds.map((locationId) => ({ organisation_id: organisation.id, location_id: locationId })), { ignoreDuplicates: true });
      }
    }

    if (visibility) {
      await syncVisibilityEntries(OrganisationVisibility, 'organisation_id', organisation.id, visibility);
    }

    const hydrated = await loadOrganisation(organisation.id, context);
    res.json({ success: true, data: hydrated, message: 'Organisation updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteOrganisation = async (req, res) => {
  try {
    const context = req.visibilityContext;
    if (!ensurePrivileged(context)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions to delete organisations' });
    }

    const organisation = await Organisation.findByPk(req.params.id);
    if (!organisation) {
      return res.status(404).json({ success: false, message: 'Organisation not found' });
    }

    await organisation.destroy();
    res.json({ success: true, data: null, message: 'Organisation deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const listOrganisationTypes = async (_req, res) => {
  try {
    const types = await OrganisationType.findAll({ order: [['name', 'ASC']] });
    res.json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createOrganisationType = async (req, res) => {
  try {
    const context = req.visibilityContext;
    if (!context?.isWorldAdmin && !context?.isSystemAdmin) {
      return res.status(403).json({ success: false, message: 'Only world admins may manage organisation types' });
    }

    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }

    const type = await OrganisationType.create({ name, description, created_at: new Date() });
    res.status(201).json({ success: true, data: type, message: 'Organisation type created' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOrganisationType = async (req, res) => {
  try {
    const context = req.visibilityContext;
    if (!context?.isWorldAdmin && !context?.isSystemAdmin) {
      return res.status(403).json({ success: false, message: 'Only world admins may manage organisation types' });
    }

    const type = await OrganisationType.findByPk(req.params.id);
    if (!type) {
      return res.status(404).json({ success: false, message: 'Organisation type not found' });
    }

    const { name, description } = req.body;
    if (typeof name !== 'undefined') type.name = name;
    if (typeof description !== 'undefined') type.description = description;
    await type.save();

    res.json({ success: true, data: type, message: 'Organisation type updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteOrganisationType = async (req, res) => {
  try {
    const context = req.visibilityContext;
    if (!context?.isWorldAdmin && !context?.isSystemAdmin) {
      return res.status(403).json({ success: false, message: 'Only world admins may manage organisation types' });
    }

    const type = await OrganisationType.findByPk(req.params.id);
    if (!type) {
      return res.status(404).json({ success: false, message: 'Organisation type not found' });
    }

    await type.destroy();
    res.json({ success: true, data: null, message: 'Organisation type deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
