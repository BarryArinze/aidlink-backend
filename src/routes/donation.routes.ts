import { Router } from 'express';
import { DonationController } from '../controllers/donation.controller';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';
import { validate } from '../middleware/validation';

const router = Router();

// Validation schemas
const createDonationSchema = z.object({
  campaignId: z.string().min(1, 'Campaign ID is required'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().default('XLM'),
  fromWallet: z.string().optional(),
  toWallet: z.string().optional(),
  memo: z.string().optional(),
  isAnonymous: z.boolean().default(false),
  donorMessage: z.string().optional(),
});

const confirmDonationSchema = z.object({
  txHash: z.string().min(1, 'Transaction hash is required'),
});

/**
 * @route   POST /api/v1/donations
 * @desc    Create a new donation
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  validate(createDonationSchema),
  DonationController.createDonation
);

/**
 * @route   GET /api/v1/donations
 * @desc    Get all donations with filtering and pagination
 * @access  Private (Admin, Organization)
 */
router.get(
  '/',
  authenticate,
  DonationController.getDonations
);

/**
 * @route   GET /api/v1/donations/my-donations
 * @desc    Get current user's donations
 * @access  Private
 */
router.get(
  '/my-donations',
  authenticate,
  DonationController.getMyDonations
);

/**
 * @route   GET /api/v1/donations/campaign/:campaignId
 * @desc    Get donations for a specific campaign
 * @access  Private
 */
router.get(
  '/campaign/:campaignId',
  authenticate,
  DonationController.getCampaignDonations
);

/**
 * @route   GET /api/v1/donations/:id
 * @desc    Get donation by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  DonationController.getDonationById
);

/**
 * @route   POST /api/v1/donations/:id/confirm
 * @desc    Confirm a donation with blockchain transaction
 * @access  Private
 */
router.post(
  '/:id/confirm',
  authenticate,
  validate(confirmDonationSchema),
  DonationController.confirmDonation
);

/**
 * @route   POST /api/v1/donations/:id/refund
 * @desc    Refund a donation
 * @access  Private (Admin, Donor for own donation)
 */
router.post(
  '/:id/refund',
  authenticate,
  DonationController.refundDonation
);

export default router;
