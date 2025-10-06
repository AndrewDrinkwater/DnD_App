import { World, Campaign, User } from '../models/index.js';

export const getWorlds = async (req, res) => {
  try {
    const worlds = await World.findAll({ include: [{ model: Campaign, as: 'campaigns' }] });
    res.json({ success: true, data: worlds });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getWorldById = async (req, res) => {
  try {
    const world = await World.findByPk(req.params.id, { include: [{ model: Campaign, as: 'campaigns' }] });
    if (!world) {
      return res.status(404).json({ success: false, message: 'World not found' });
    }
    res.json({ success: true, data: world });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createWorld = async (req, res) => {
  try {
    const { name, description, created_by } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }

    if (created_by) {
      const creator = await User.findByPk(created_by);
      if (!creator) {
        return res.status(404).json({ success: false, message: 'Creator not found' });
      }
    }

    const world = await World.create({ name, description, created_by });
    res.status(201).json({ success: true, data: world, message: 'World created' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateWorld = async (req, res) => {
  try {
    const world = await World.findByPk(req.params.id);
    if (!world) {
      return res.status(404).json({ success: false, message: 'World not found' });
    }

    const { name, description } = req.body;
    if (typeof name === 'undefined' && typeof description === 'undefined') {
      return res.status(400).json({ success: false, message: 'Nothing to update' });
    }

    if (typeof name !== 'undefined') world.name = name;
    if (typeof description !== 'undefined') world.description = description;

    await world.save();
    res.json({ success: true, data: world, message: 'World updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteWorld = async (req, res) => {
  try {
    const world = await World.findByPk(req.params.id);
    if (!world) {
      return res.status(404).json({ success: false, message: 'World not found' });
    }

    await world.destroy();
    res.json({ success: true, data: world, message: 'World deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getWorldCampaigns = async (req, res) => {
  try {
    const world = await World.findByPk(req.params.id);
    if (!world) {
      return res.status(404).json({ success: false, message: 'World not found' });
    }

    const campaigns = await Campaign.findAll({
      where: { world_id: world.id },
      include: [
        { association: 'roles' },
        { association: 'creator' }
      ]
    });

    res.json({ success: true, data: campaigns });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
