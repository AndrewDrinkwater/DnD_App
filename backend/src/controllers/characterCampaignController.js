import { CharacterCampaign, Character, Campaign } from '../models/index.js';

export const getCharacterCampaigns = async (req, res) => {
  try {
    const links = await CharacterCampaign.findAll({
      include: [
        { association: 'character' },
        { association: 'campaign' }
      ]
    });
    res.json({ success: true, data: links });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createCharacterCampaign = async (req, res) => {
  try {
    const { character_id, campaign_id } = req.body;
    if (!character_id || !campaign_id) {
      return res.status(400).json({ success: false, message: 'character_id and campaign_id are required' });
    }

    const [character, campaign] = await Promise.all([
      Character.findByPk(character_id),
      Campaign.findByPk(campaign_id)
    ]);

    if (!character || !campaign) {
      return res.status(404).json({ success: false, message: 'Character or campaign not found' });
    }

    const [link, created] = await CharacterCampaign.findOrCreate({
      where: { character_id, campaign_id },
      defaults: { character_id, campaign_id }
    });

    res.status(created ? 201 : 200).json({
      success: true,
      data: link,
      message: created ? 'Character linked to campaign' : 'Link already exists'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteCharacterCampaign = async (req, res) => {
  try {
    const link = await CharacterCampaign.findByPk(req.params.id);
    if (!link) {
      return res.status(404).json({ success: false, message: 'Link not found' });
    }

    await link.destroy();
    res.json({ success: true, data: link, message: 'Link removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
