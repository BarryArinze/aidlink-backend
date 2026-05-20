import { Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/error';

export class AnalyticsController {
  static async getCampaignAnalytics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { campaignId } = req.params;
      
      const analytics = await AnalyticsService.getCampaignAnalytics(campaignId);
      
      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDonorAnalytics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const analytics = await AnalyticsService.getDonorAnalytics(req.user.id);
      
      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getOrganizationAnalytics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const { organizationId } = req.params;
      
      const analytics = await AnalyticsService.getOrganizationAnalytics(organizationId);
      
      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPlatformAnalytics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'ADMIN') {
        throw new AppError('Admin access required', 403);
      }

      const analytics = await AnalyticsService.getPlatformAnalytics();
      
      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }

  static async generateReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const { reportType } = req.params;
      const filters = req.body;
      
      const report = await AnalyticsService.generateReport(reportType, filters);
      
      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }
}
