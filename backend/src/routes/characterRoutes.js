import { Router } from 'express';
import {
  getCharacters,
  getCharacterById,
  createCharacter,
  updateCharacter,
  deleteCharacter,
  assignCharacterToCampaign
} from '../controllers/characterController.js';

const router = Router();

router.get('/', getCharacters);
router.get('/:id', getCharacterById);
router.post('/', createCharacter);
router.put('/:id', updateCharacter);
router.delete('/:id', deleteCharacter);
router.post('/:id/campaigns', assignCharacterToCampaign);

export default router;
