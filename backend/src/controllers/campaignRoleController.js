import { CampaignRole, Campaign } from '../models/index.js';

export const getCampaignRoles = async (req, res) => {
  try {
    const roles = await CampaignRole.findAll({ include: [{ association: 'campaign' }] });
    res.json({ success: true, data: roles });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCampaignRoleById = async (req, res) => {
  try {
    const role = await CampaignRole.findByPk(req.params.id, { include: [{ association: 'campaign' }] });
    if (!role) {
      return res.status(404).json({ success: false, message: 'Campaign role not found' });
    }
    res.json({ success: true, data: role });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createCampaignRole = async (req, res) => {
  try {
    const { name, description, campaign_id } = req.body;
    if (!name || !campaign_id) {
      return res.status(400).json({ success: false, message: 'name and campaign_id are required' });
    }

    const campaign = await Campaign.findByPk(campaign_id);
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    const role = await CampaignRole.create({ name, description, campaign_id });
    res.status(201).json({ success: true, data: role, message: 'Campaign role created' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateCampaignRole = async (req, res) => {
  try {
    const role = await CampaignRole.findByPk(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Campaign role not found' });
    }

    const { name, description } = req.body;
    if (typeof name === 'undefined' && typeof description === 'undefined') {
      return res.status(400).json({ success: false, message: 'Nothing to update' });
    }

    if (typeof name !== 'undefined') role.name = name;
    if (typeof description !== 'undefined') role.description = description;

    await role.save();
    res.json({ success: true, data: role, message: 'Campaign role updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteCampaignRole = async (req, res) => {
  try {
    const role = await CampaignRole.findByPk(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Campaign role not found' });
    }

    await role.destroy();
    res.json({ success: true, data: role, message: 'Campaign role deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
