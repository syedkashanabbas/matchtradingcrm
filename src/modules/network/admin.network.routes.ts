import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/requireAdmin.middleware';
import {
  getOverview,
  getUserNetworkInfo,
  getUserTree,
  getOrphans,
  getAllClientNetworks,
  assignUpline,
  changeUpline
} from './admin.network.controller';

const router = Router();

// All routes require authentication first, then admin authorization
router.use(authenticate);
router.use(requireAdmin);

router.get('/overview', getOverview);
router.get('/all-networks', getAllClientNetworks);
router.get('/user/:userId', getUserNetworkInfo);
router.get('/user/:userId/tree', getUserTree);
router.get('/orphans', getOrphans);
router.patch('/orphans/:userId/assign-upline', assignUpline);
router.patch('/user/:userId/change-upline', changeUpline);

export default router;
