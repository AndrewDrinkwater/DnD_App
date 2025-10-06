import { Router } from 'express';
import {
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignRoles,
  getCampaignUsers,
  getCampaignCharacters
} from '../controllers/campaignController.js';

const router = Router();

router.get('/', getCampaigns);
router.get('/:id', getCampaignById);
router.post('/', createCampaign);
router.put('/:id', updateCampaign);
router.delete('/:id', deleteCampaign);
router.get('/:id/roles', getCampaignRoles);
router.get('/:id/users', getCampaignUsers);
router.get('/:id/characters', getCampaignCharacters);

export default router;
