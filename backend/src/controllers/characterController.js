import {
  Character,
  User,
  Campaign,
  CharacterCampaign
} from '../models/index.js';

const characterIncludes = [
  { model: User, as: 'owner' },
  { model: Campaign, as: 'campaigns', through: { attributes: [] } }
];

const ensureCharacterExists = async (id, res) => {
  const character = await Character.findByPk(id);
  if (!character) {
    res.status(404).json({ success: false, message: 'Character not found' });
    return null;
  }
  return character;
};

export const getCharacters = async (req, res) => {
  try {
    const characters = await Character.findAll({ include: characterIncludes });
    res.json({ success: true, data: characters });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCharacterById = async (req, res) => {
  try {
    const character = await Character.findByPk(req.params.id, { include: characterIncludes });
    if (!character) {
      return res.status(404).json({ success: false, message: 'Character not found' });
    }
    res.json({ success: true, data: character });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createCharacter = async (req, res) => {
  try {
    const { name, user_id, description, level, class: charClass, stats_json, active } = req.body;
    if (!name || !user_id) {
      return res.status(400).json({ success: false, message: 'name and user_id are required' });
    }

    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const character = await Character.create({
      name,
      user_id,
      description,
      level,
      class: charClass,
      stats_json,
      active
    });

    const created = await Character.findByPk(character.id, { include: characterIncludes });
    res.status(201).json({ success: true, data: created, message: 'Character created' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateCharacter = async (req, res) => {
  try {
    const character = await ensureCharacterExists(req.params.id, res);
    if (!character) return;

    const { name, description, level, class: charClass, stats_json, active } = req.body;
    if (typeof name === 'undefined' && typeof description === 'undefined' && typeof level === 'undefined' && typeof charClass === 'undefined' && typeof stats_json === 'undefined' && typeof active === 'undefined') {
      return res.status(400).json({ success: false, message: 'Nothing to update' });
    }

    if (typeof name !== 'undefined') character.name = name;
    if (typeof description !== 'undefined') character.description = description;
    if (typeof level !== 'undefined') character.level = level;
    if (typeof charClass !== 'undefined') character.set('class', charClass);
    if (typeof stats_json !== 'undefined') character.stats_json = stats_json;
    if (typeof active !== 'undefined') character.active = active;

    await character.save();
    const updated = await Character.findByPk(character.id, { include: characterIncludes });
    res.json({ success: true, data: updated, message: 'Character updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteCharacter = async (req, res) => {
  try {
    const character = await ensureCharacterExists(req.params.id, res);
    if (!character) return;

    await character.destroy();
    res.json({ success: true, data: character, message: 'Character deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const assignCharacterToCampaign = async (req, res) => {
  try {
    const character = await ensureCharacterExists(req.params.id, res);
    if (!character) return;

    const { campaignId } = req.body;
    if (!campaignId) {
      return res.status(400).json({ success: false, message: 'campaignId is required' });
    }

    const campaign = await Campaign.findByPk(campaignId);
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    const [link, created] = await CharacterCampaign.findOrCreate({
      where: { character_id: character.id, campaign_id: campaign.id },
      defaults: { character_id: character.id, campaign_id: campaign.id }
    });

    res.status(created ? 201 : 200).json({
      success: true,
      data: link,
      message: created ? 'Character assigned to campaign' : 'Character already in campaign'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
