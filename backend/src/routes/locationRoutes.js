import { Router } from 'express';
import {
  listLocations,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation,
  listLocationTypes,
  createLocationType,
  updateLocationType,
  deleteLocationType
} from '../controllers/locationController.js';
import { applyVisibilityFilter } from '../middleware/visibilityMiddleware.js';

const router = Router();

router.use(applyVisibilityFilter({ requireVisibilityForWrite: true }));

router.get('/', listLocations);
router.get('/types', listLocationTypes);
router.post('/types', createLocationType);
router.put('/types/:id', updateLocationType);
router.delete('/types/:id', deleteLocationType);
router.get('/:id', getLocation);
router.post('/', createLocation);
router.put('/:id', updateLocation);
router.delete('/:id', deleteLocation);

export default router;
