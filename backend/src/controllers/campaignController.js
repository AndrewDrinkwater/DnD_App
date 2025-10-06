import {
  sequelize,
  Campaign,
  CampaignRole,
  User,
  World,
  UserCampaignRole,
  Character
} from '../models/index.js';

const campaignIncludes = [
  { association: 'roles' },
  { association: 'creator' },
  { association: 'world' },
  { model: Character, as: 'characters', through: { attributes: [] } }
];

const ensureCampaignExists = async (id, res) => {
  const campaign = await Campaign.findByPk(id);
  if (!campaign) {
    res.status(404).json({ success: false, message: 'Campaign not found' });
    return null;
  }
  return campaign;
};

export const getCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.findAll({ include: campaignIncludes });
    res.json({ success: true, data: campaigns });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCampaignById = async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id, { include: campaignIncludes });
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }
    res.json({ success: true, data: campaign });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createCampaign = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { name, description, world_id, created_by } = req.body;
    if (!name) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'name is required' });
    }

    if (!created_by) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'created_by is required to assign Dungeon Master' });
    }

    const creator = await User.findByPk(created_by, { transaction });
    if (!creator) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Creator not found' });
    }

    if (world_id) {
      const world = await World.findByPk(world_id, { transaction });
      if (!world) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: 'World not found' });
      }
    }

    const campaign = await Campaign.create({ name, description, world_id, created_by }, { transaction });

    const roles = await CampaignRole.bulkCreate([
      { name: 'Dungeon Master', description: 'Campaign overseer', campaign_id: campaign.id },
      { name: 'Player', description: 'Player participant', campaign_id: campaign.id },
      { name: 'Viewer', description: 'View-only participant', campaign_id: campaign.id }
    ], { transaction, returning: true });

    const dmRole = roles.find((role) => role.name === 'Dungeon Master');
    if (dmRole) {
      await UserCampaignRole.create({
        user_id: created_by,
        campaign_id: campaign.id,
        campaign_role_id: dmRole.id
      }, { transaction });
    }

    await transaction.commit();

    const created = await Campaign.findByPk(campaign.id, { include: campaignIncludes });
    res.status(201).json({ success: true, data: created, message: 'Campaign created' });
  } catch (err) {
    await transaction.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateCampaign = async (req, res) => {
  try {
    const campaign = await ensureCampaignExists(req.params.id, res);
    if (!campaign) return;

    const { name, description, world_id } = req.body;
    if (typeof name === 'undefined' && typeof description === 'undefined' && typeof world_id === 'undefined') {
      return res.status(400).json({ success: false, message: 'Nothing to update' });
    }

    if (typeof world_id !== 'undefined') {
      if (world_id === null) {
        campaign.world_id = null;
      } else {
        const world = await World.findByPk(world_id);
        if (!world) {
          return res.status(404).json({ success: false, message: 'World not found' });
        }
        campaign.world_id = world_id;
      }
    }
    if (typeof name !== 'undefined') campaign.name = name;
    if (typeof description !== 'undefined') campaign.description = description;

    await campaign.save();
    const refreshed = await Campaign.findByPk(campaign.id, { include: campaignIncludes });
    res.json({ success: true, data: refreshed, message: 'Campaign updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteCampaign = async (req, res) => {
  try {
    const campaign = await ensureCampaignExists(req.params.id, res);
    if (!campaign) return;

    await campaign.destroy();
    res.json({ success: true, data: campaign, message: 'Campaign deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCampaignRoles = async (req, res) => {
  try {
    const campaign = await ensureCampaignExists(req.params.id, res);
    if (!campaign) return;

    const roles = await CampaignRole.findAll({ where: { campaign_id: campaign.id } });
    res.json({ success: true, data: roles });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCampaignUsers = async (req, res) => {
  try {
    const campaign = await ensureCampaignExists(req.params.id, res);
    if (!campaign) return;

    const assignments = await UserCampaignRole.findAll({
      where: { campaign_id: campaign.id },
      include: [
        { association: 'user' },
        { association: 'role' }
      ]
    });

    res.json({ success: true, data: assignments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCampaignCharacters = async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id, {
      include: [{ model: Character, as: 'characters', through: { attributes: [] } }]
    });

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    res.json({ success: true, data: campaign.characters });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
