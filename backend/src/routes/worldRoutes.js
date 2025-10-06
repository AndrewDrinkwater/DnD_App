import { Router } from 'express';
import {
  getWorlds,
  getWorldById,
  createWorld,
  updateWorld,
  deleteWorld,
  getWorldCampaigns
} from '../controllers/worldController.js';

const router = Router();

router.get('/', getWorlds);
router.get('/:id', getWorldById);
router.post('/', createWorld);
router.put('/:id', updateWorld);
router.delete('/:id', deleteWorld);
router.get('/:id/campaigns', getWorldCampaigns);

export default router;
