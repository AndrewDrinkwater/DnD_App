import { Router } from 'express';
import {
  getCampaignRoles,
  getCampaignRoleById,
  createCampaignRole,
  updateCampaignRole,
  deleteCampaignRole
} from '../controllers/campaignRoleController.js';

const router = Router();

router.get('/', getCampaignRoles);
router.get('/:id', getCampaignRoleById);
router.post('/', createCampaignRole);
router.put('/:id', updateCampaignRole);
router.delete('/:id', deleteCampaignRole);

export default router;
