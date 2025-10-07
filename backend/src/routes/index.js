import { Router } from 'express';
import userRoutes from './userRoutes.js';
import systemRoleRoutes from './systemRoleRoutes.js';
import worldRoutes from './worldRoutes.js';
import campaignRoutes from './campaignRoutes.js';
import campaignRoleRoutes from './campaignRoleRoutes.js';
import userCampaignRoleRoutes from './userCampaignRoleRoutes.js';
import characterRoutes from './characterRoutes.js';
import characterCampaignRoutes from './characterCampaignRoutes.js';
import locationRoutes from './locationRoutes.js';
import organisationRoutes from './organisationRoutes.js';
import npcRoutes from './npcRoutes.js';
import raceRoutes from './raceRoutes.js';
import { attachContext } from '../middleware/contextMiddleware.js';

const router = Router();

router.use(attachContext);

router.use('/users', userRoutes);
router.use('/system-roles', systemRoleRoutes);
router.use('/worlds', worldRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/campaign-roles', campaignRoleRoutes);
router.use('/user-campaign-roles', userCampaignRoleRoutes);
router.use('/characters', characterRoutes);
router.use('/character-campaigns', characterCampaignRoutes);
router.use('/locations', locationRoutes);
router.use('/organisations', organisationRoutes);
router.use('/npcs', npcRoutes);
router.use('/races', raceRoutes);

export default router;
