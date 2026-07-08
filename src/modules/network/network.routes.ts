import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  getMyReferralLink,
  getMyTree,
  getDirectReferrals,
  getNetworkStats,
  getLeaderboard,
  getActivityFeed,
  getInviterInfo
} from './network.controller';

const router = Router();

// Public route to get inviter info (no authentication required)
router.get('/inviter/:refCode', getInviterInfo);

// All other routes require authentication
router.use(authenticate);

router.get('/my-referral-link', getMyReferralLink);
router.get('/my-tree', getMyTree);
router.get('/direct-referrals', getDirectReferrals);
router.get('/stats', getNetworkStats);
router.get('/leaderboard', getLeaderboard);
router.get('/activity-feed', getActivityFeed);

export default router;
