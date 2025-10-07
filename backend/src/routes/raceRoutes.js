import { Router } from 'express';
import {
  listRaces,
  createRace,
  updateRace,
  deleteRace
} from '../controllers/raceController.js';
import { applyVisibilityFilter } from '../middleware/visibilityMiddleware.js';

const router = Router();

router.use(applyVisibilityFilter({ requireVisibilityForWrite: true }));

router.get('/', listRaces);
router.post('/', createRace);
router.put('/:id', updateRace);
router.delete('/:id', deleteRace);

export default router;
