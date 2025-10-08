import Race from '../models/Race.js';

export const listRaces = async (_req, res) => {
  try {
    const races = await Race.findAll({ order: [['name', 'ASC']] });
    res.json({ success: true, data: races });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createRace = async (req, res) => {
  try {
    const context = req.visibilityContext;
    if (!context?.isWorldAdmin && !context?.isSystemAdmin) {
      return res.status(403).json({ success: false, message: 'Only world admins may create races' });
    }

    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }

    const race = await Race.create({ name, description, created_by: req.user.id, created_at: new Date() });
    res.status(201).json({ success: true, data: race, message: 'Race created' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateRace = async (req, res) => {
  try {
    const context = req.visibilityContext;
    if (!context?.isWorldAdmin && !context?.isSystemAdmin) {
      return res.status(403).json({ success: false, message: 'Only world admins may update races' });
    }

    const race = await Race.findByPk(req.params.id);
    if (!race) {
      return res.status(404).json({ success: false, message: 'Race not found' });
    }

    const { name, description } = req.body;
    if (typeof name !== 'undefined') race.name = name;
    if (typeof description !== 'undefined') race.description = description;

    await race.save();
    res.json({ success: true, data: race, message: 'Race updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteRace = async (req, res) => {
  try {
    const context = req.visibilityContext;
    if (!context?.isWorldAdmin && !context?.isSystemAdmin) {
      return res.status(403).json({ success: false, message: 'Only world admins may delete races' });
    }

    const race = await Race.findByPk(req.params.id);
    if (!race) {
      return res.status(404).json({ success: false, message: 'Race not found' });
    }

    await race.destroy();
    res.json({ success: true, data: null, message: 'Race deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
