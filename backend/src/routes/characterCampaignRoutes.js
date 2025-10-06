import { Router } from 'express';
import {
  getCharacterCampaigns,
  createCharacterCampaign,
  deleteCharacterCampaign
} from '../controllers/characterCampaignController.js';

const router = Router();

router.get('/', getCharacterCampaigns);
router.post('/', createCharacterCampaign);
router.delete('/:id', deleteCharacterCampaign);

export default router;
