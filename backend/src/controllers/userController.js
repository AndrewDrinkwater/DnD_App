import { Op } from 'sequelize';
import {
  User,
  Campaign,
  CampaignRole,
  Character,
  SystemRole,
  UserSystemRole,
  UserCampaignRole
} from '../models/index.js';

const userIncludes = [
  { model: Character, as: 'characters', include: [{ model: Campaign, as: 'campaigns', through: { attributes: [] } }] },
  { model: SystemRole, as: 'systemRoles', through: { attributes: [] } }
];

const ensureUserExists = async (id, res) => {
  const user = await User.findByPk(id);
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return null;
  }
  return user;
};

export const getUsers = async (req, res) => {
  try {
    const users = await User.findAll({ include: userIncludes });
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, { include: userIncludes });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const { username, email, password_hash } = req.body;
    if (!username || !email || !password_hash) {
      return res.status(400).json({ success: false, message: 'username, email and password_hash are required' });
    }

    const existing = await User.findOne({ where: { [Op.or]: [{ username }, { email }] } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'User with provided username or email already exists' });
    }

    const user = await User.create({ username, email, password_hash });
    res.status(201).json({ success: true, data: user, message: 'User created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const user = await ensureUserExists(req.params.id, res);
    if (!user) return;

    const { username, email, password_hash, active } = req.body;
    if (typeof username === 'undefined' && typeof email === 'undefined' && typeof password_hash === 'undefined' && typeof active === 'undefined') {
      return res.status(400).json({ success: false, message: 'At least one field must be provided for update' });
    }

    if (typeof username !== 'undefined') user.username = username;
    if (typeof email !== 'undefined') user.email = email;
    if (typeof password_hash !== 'undefined') user.password_hash = password_hash;
    if (typeof active !== 'undefined') user.active = active;

    await user.save();
    const reloaded = await User.findByPk(user.id, { include: userIncludes });
    res.json({ success: true, data: reloaded, message: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await ensureUserExists(req.params.id, res);
    if (!user) return;

    user.active = false;
    await user.save();
    res.json({ success: true, data: user, message: 'User deactivated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getUserCampaigns = async (req, res) => {
  try {
    const user = await ensureUserExists(req.params.id, res);
    if (!user) return;

    const assignments = await UserCampaignRole.findAll({
      where: { user_id: user.id },
      include: [
        {
          model: Campaign,
          as: 'campaign',
          include: [
            { model: CampaignRole, as: 'roles' },
            { model: Character, as: 'characters', through: { attributes: [] } }
          ]
        },
        { model: CampaignRole, as: 'role' }
      ]
    });

    res.json({ success: true, data: assignments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getUserCharacters = async (req, res) => {
  try {
    const user = await ensureUserExists(req.params.id, res);
    if (!user) return;

    const characters = await Character.findAll({
      where: { user_id: user.id },
      include: [{ model: Campaign, as: 'campaigns', through: { attributes: [] } }]
    });

    res.json({ success: true, data: characters });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getUserSystemRoles = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [{ model: SystemRole, as: 'systemRoles', through: { attributes: [] } }]
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user.systemRoles });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const assignSystemRoleToUser = async (req, res) => {
  try {
    const { roleId } = req.body;
    if (!roleId) {
      return res.status(400).json({ success: false, message: 'roleId is required' });
    }

    const user = await ensureUserExists(req.params.id, res);
    if (!user) return;

    const systemRole = await SystemRole.findByPk(roleId);
    if (!systemRole) {
      return res.status(404).json({ success: false, message: 'System role not found' });
    }

    const [assignment, created] = await UserSystemRole.findOrCreate({
      where: { user_id: user.id, system_role_id: systemRole.id },
      defaults: { user_id: user.id, system_role_id: systemRole.id }
    });

    res.status(created ? 201 : 200).json({
      success: true,
      data: assignment,
      message: created ? 'Role assigned to user' : 'User already has this role'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
