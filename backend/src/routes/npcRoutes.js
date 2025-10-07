import { Router } from 'express';
import {
  listNpcs,
  getNpc,
  createNpc,
  updateNpc,
  deleteNpc,
  addNpcNote,
  updateNpcNote,
  deleteNpcNote,
  listNpcTypes,
  createNpcType,
  updateNpcType,
  deleteNpcType
} from '../controllers/npcController.js';
import { applyVisibilityFilter } from '../middleware/visibilityMiddleware.js';

const router = Router();

router.use(applyVisibilityFilter({ requireVisibilityForWrite: true }));

router.get('/', listNpcs);
router.get('/types', listNpcTypes);
router.post('/types', createNpcType);
router.put('/types/:id', updateNpcType);
router.delete('/types/:id', deleteNpcType);
router.post('/:id/notes', addNpcNote);
router.put('/:id/notes/:noteId', updateNpcNote);
router.delete('/:id/notes/:noteId', deleteNpcNote);
router.get('/:id', getNpc);
router.post('/', createNpc);
router.put('/:id', updateNpc);
router.delete('/:id', deleteNpc);

export default router;
