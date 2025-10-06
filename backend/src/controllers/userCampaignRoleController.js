import { UserCampaignRole, User, Campaign, CampaignRole } from '../models/index.js';

export const getUserCampaignRoles = async (req, res) => {
  try {
    const assignments = await UserCampaignRole.findAll({
      include: [
        { association: 'user' },
        { association: 'campaign' },
        { association: 'role' }
      ]
    });
    res.json({ success: true, data: assignments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createUserCampaignRole = async (req, res) => {
  try {
    const { user_id, campaign_id, campaign_role_id } = req.body;
    if (!user_id || !campaign_id || !campaign_role_id) {
      return res.status(400).json({ success: false, message: 'user_id, campaign_id and campaign_role_id are required' });
    }

    const [user, campaign, role] = await Promise.all([
      User.findByPk(user_id),
      Campaign.findByPk(campaign_id),
      CampaignRole.findByPk(campaign_role_id)
    ]);

    if (!user || !campaign || !role) {
      return res.status(404).json({ success: false, message: 'User, campaign or role not found' });
    }

    if (role.campaign_id !== campaign.id) {
      return res.status(400).json({ success: false, message: 'Role does not belong to the specified campaign' });
    }

    const [assignment, created] = await UserCampaignRole.findOrCreate({
      where: { user_id, campaign_id, campaign_role_id },
      defaults: { user_id, campaign_id, campaign_role_id }
    });

    res.status(created ? 201 : 200).json({
      success: true,
      data: assignment,
      message: created ? 'Assignment created' : 'Assignment already exists'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteUserCampaignRole = async (req, res) => {
  try {
    const assignment = await UserCampaignRole.findByPk(req.params.id);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    await assignment.destroy();
    res.json({ success: true, data: assignment, message: 'Assignment removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
