import prisma from '../config/database';
import logger from '../config/logger';

export class AnalyticsService {
  static async getCampaignAnalytics(campaignId: string): Promise<any> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        _count: {
          select: {
            donations: true,
            beneficiaries: true,
            distributions: true,
          },
        },
        donations: {
          where: { status: 'CONFIRMED' },
          select: {
            amount: true,
            createdAt: true,
          },
        },
        distributions: {
          select: {
            amount: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Calculate donation statistics
    const totalDonations = campaign.donations.length;
    const totalRaised = campaign.donations.reduce((sum, d) => sum + Number(d.amount), 0);
    const avgDonation = totalDonations > 0 ? totalRaised / totalDonations : 0;

    // Calculate distribution statistics
    const totalDistributed = campaign.distributions
      .filter(d => d.status === 'COMPLETED')
      .reduce((sum, d) => sum + Number(d.amount), 0);

    // Calculate progress percentage
    const progress = Number(campaign.targetAmount) > 0 
      ? (Number(campaign.currentAmount) / Number(campaign.targetAmount)) * 100 
      : 0;

    // Daily donation trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyDonations = await prisma.donation.groupBy({
      by: ['createdAt'],
      where: {
        campaignId,
        status: 'CONFIRMED',
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: { amount: true },
      _count: true,
    });

    return {
      campaign: {
        id: campaign.id,
        title: campaign.title,
        targetAmount: campaign.targetAmount,
        currentAmount: campaign.currentAmount,
        progress,
        status: campaign.status,
      },
      donations: {
        total: totalDonations,
        totalRaised,
        avgDonation,
        count: campaign._count.donations,
      },
      distributions: {
        total: campaign._count.distributions,
        totalDistributed,
        completed: campaign.distributions.filter(d => d.status === 'COMPLETED').length,
      },
      beneficiaries: {
        total: campaign._count.beneficiaries,
      },
      dailyTrend: dailyDonations,
    };
  }

  static async getDonorAnalytics(userId: string): Promise<any> {
    const donations = await prisma.donation.findMany({
      where: { userId, status: 'CONFIRMED' },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalDonated = donations.reduce((sum, d) => sum + Number(d.amount), 0);
    const campaignsSupported = new Set(donations.map(d => d.campaignId)).size;

    // Monthly donation trend
    const monthlyDonations = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', "createdAt") as month,
        SUM(amount) as total,
        COUNT(*) as count
      FROM "Donation"
      WHERE "userId" = ${userId}
        AND "status" = 'CONFIRMED'
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month DESC
      LIMIT 12
    `;

    return {
      totalDonated,
      totalDonations: donations.length,
      campaignsSupported,
      avgDonation: donations.length > 0 ? totalDonated / donations.length : 0,
      recentDonations: donations.slice(0, 10),
      monthlyTrend: monthlyDonations,
    };
  }

  static async getOrganizationAnalytics(organizationId: string): Promise<any> {
    const campaigns = await prisma.campaign.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: {
            donations: true,
            beneficiaries: true,
            distributions: true,
          },
        },
        donations: {
          where: { status: 'CONFIRMED' },
          select: { amount: true },
        },
      },
    });

    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE').length;
    const totalRaised = campaigns.reduce((sum, c) => 
      sum + c.donations.reduce((dSum, d) => dSum + Number(d.amount), 0), 0);
    const totalBeneficiaries = campaigns.reduce((sum, c) => sum + c._count.beneficiaries, 0);
    const totalDistributions = campaigns.reduce((sum, c) => sum + c._count.distributions, 0);

    return {
      campaigns: {
        total: totalCampaigns,
        active: activeCampaigns,
        completed: campaigns.filter(c => c.status === 'COMPLETED').length,
      },
      funds: {
        totalRaised,
        avgPerCampaign: totalCampaigns > 0 ? totalRaised / totalCampaigns : 0,
      },
      impact: {
        totalBeneficiaries,
        totalDistributions,
      },
    };
  }

  static async getPlatformAnalytics(): Promise<any> {
    const [
      totalUsers,
      totalCampaigns,
      totalDonations,
      totalDistributions,
      totalBeneficiaries,
      recentUsers,
      recentCampaigns,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.campaign.count(),
      prisma.donation.count({ where: { status: 'CONFIRMED' } }),
      prisma.distribution.count({ where: { status: 'COMPLETED' } }),
      prisma.beneficiary.count(),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          createdAt: true,
        },
      }),
      prisma.campaign.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          currentAmount: true,
          targetAmount: true,
          createdAt: true,
        },
      }),
    ]);

    // Calculate total funds raised
    const fundsResult = await prisma.donation.aggregate({
      where: { status: 'CONFIRMED' },
      _sum: { amount: true },
    });

    // Calculate total funds distributed
    const distributedResult = await prisma.distribution.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amount: true },
    });

    return {
      overview: {
        totalUsers,
        totalCampaigns,
        totalDonations,
        totalDistributions,
        totalBeneficiaries,
      },
      financials: {
        totalRaised: fundsResult._sum.amount || 0,
        totalDistributed: distributedResult._sum.amount || 0,
      },
      recent: {
        users: recentUsers,
        campaigns: recentCampaigns,
      },
    };
  }

  static async generateReport(reportType: string, filters: any): Promise<any> {
    switch (reportType) {
      case 'campaign':
        if (!filters.campaignId) {
          throw new Error('Campaign ID is required for campaign report');
        }
        return this.getCampaignAnalytics(filters.campaignId);
      
      case 'donor':
        if (!filters.userId) {
          throw new Error('User ID is required for donor report');
        }
        return this.getDonorAnalytics(filters.userId);
      
      case 'organization':
        if (!filters.organizationId) {
          throw new Error('Organization ID is required for organization report');
        }
        return this.getOrganizationAnalytics(filters.organizationId);
      
      case 'platform':
        return this.getPlatformAnalytics();
      
      default:
        throw new Error('Invalid report type');
    }
  }
}
