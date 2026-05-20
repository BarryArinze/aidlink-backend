import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/v1/analytics/campaign/:campaignId
 * @desc    Get analytics for a specific campaign
 * @access  Private
 */
router.get(
  '/campaign/:campaignId',
  authenticate,
  AnalyticsController.getCampaignAnalytics
);

/**
 * @route   GET /api/v1/analytics/donor
 * @desc    Get analytics for current donor
 * @access  Private
 */
router.get(
  '/donor',
  authenticate,
  AnalyticsController.getDonorAnalytics
);

/**
 * @route   GET /api/v1/analytics/organization/:organizationId
 * @desc    Get analytics for an organization
 * @access  Private
 */
router.get(
  '/organization/:organizationId',
  authenticate,
  AnalyticsController.getOrganizationAnalytics
);

/**
 * @route   GET /api/v1/analytics/platform
 * @desc    Get platform-wide analytics
 * @access  Private (Admin)
 */
router.get(
  '/platform',
  authenticate,
  AnalyticsController.getPlatformAnalytics
);

/**
 * @route   POST /api/v1/analytics/report/:reportType
 * @desc    Generate a report
 * @access  Private
 */
router.post(
  '/report/:reportType',
  authenticate,
  AnalyticsController.generateReport
);

export default router;
