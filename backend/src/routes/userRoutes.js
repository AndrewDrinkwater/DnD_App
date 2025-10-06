import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserCampaigns,
  getUserCharacters,
  getUserSystemRoles,
  assignSystemRoleToUser
} from '../controllers/userController.js';

const router = Router();

router.get('/', getUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.get('/:id/campaigns', getUserCampaigns);
router.get('/:id/characters', getUserCharacters);
router.get('/:id/system-roles', getUserSystemRoles);
router.post('/:id/system-roles', assignSystemRoleToUser);

export default router;
