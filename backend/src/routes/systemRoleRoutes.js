import { Router } from 'express';
import {
  getSystemRoles,
  createSystemRole,
  updateSystemRole,
  deleteSystemRole
} from '../controllers/systemRoleController.js';

const router = Router();

router.get('/', getSystemRoles);
router.post('/', createSystemRole);
router.put('/:id', updateSystemRole);
router.delete('/:id', deleteSystemRole);

export default router;
