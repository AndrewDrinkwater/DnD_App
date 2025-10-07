import { Router } from 'express';
import {
  listOrganisations,
  getOrganisation,
  createOrganisation,
  updateOrganisation,
  deleteOrganisation,
  listOrganisationTypes,
  createOrganisationType,
  updateOrganisationType,
  deleteOrganisationType
} from '../controllers/organisationController.js';
import { applyVisibilityFilter } from '../middleware/visibilityMiddleware.js';

const router = Router();

router.use(applyVisibilityFilter({ requireVisibilityForWrite: true }));

router.get('/', listOrganisations);
router.get('/types', listOrganisationTypes);
router.post('/types', createOrganisationType);
router.put('/types/:id', updateOrganisationType);
router.delete('/types/:id', deleteOrganisationType);
router.get('/:id', getOrganisation);
router.post('/', createOrganisation);
router.put('/:id', updateOrganisation);
router.delete('/:id', deleteOrganisation);

export default router;
