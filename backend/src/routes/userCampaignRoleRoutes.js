import { Router } from 'express';
import {
  getUserCampaignRoles,
  createUserCampaignRole,
  deleteUserCampaignRole
} from '../controllers/userCampaignRoleController.js';

const router = Router();

router.get('/', getUserCampaignRoles);
router.post('/', createUserCampaignRole);
router.delete('/:id', deleteUserCampaignRole);

export default router;
