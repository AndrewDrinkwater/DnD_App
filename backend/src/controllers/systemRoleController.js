import { SystemRole } from '../models/index.js';

export const getSystemRoles = async (req, res) => {
  try {
    const roles = await SystemRole.findAll();
    res.json({ success: true, data: roles });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createSystemRole = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }

    const existing = await SystemRole.findOne({ where: { name } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Role with this name already exists' });
    }

    const role = await SystemRole.create({ name, description });
    res.status(201).json({ success: true, data: role, message: 'System role created' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateSystemRole = async (req, res) => {
  try {
    const role = await SystemRole.findByPk(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'System role not found' });
    }

    const { name, description } = req.body;
    if (!name && !description) {
      return res.status(400).json({ success: false, message: 'Nothing to update' });
    }

    if (name) role.name = name;
    if (description) role.description = description;
    await role.save();

    res.json({ success: true, data: role, message: 'System role updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteSystemRole = async (req, res) => {
  try {
    const role = await SystemRole.findByPk(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'System role not found' });
    }

    await role.destroy();
    res.json({ success: true, data: role, message: 'System role deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
