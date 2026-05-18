import prisma from '../config/database';
import { BeneficiaryInput, BeneficiaryFilters, PaginatedResponse } from '../types';
import { BeneficiaryStatus, Role, KYCStatus } from '@prisma/client';
import { AppError } from '../middleware/error';
import logger from '../config/logger';

export class BeneficiaryService {
  static async createBeneficiary(data: BeneficiaryInput, userId: string): Promise<any> {
    // Check if user already has a beneficiary profile
    const existing = await prisma.beneficiary.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new AppError('Beneficiary profile already exists for this user', 400);
    }

    const beneficiary = await prisma.beneficiary.create({
      data: {
        ...data,
        userId,
        status: BeneficiaryStatus.PENDING,
      },
    });

    logger.info(`Beneficiary created: ${beneficiary.id} for user ${userId}`);

    return beneficiary;
  }

  static async getBeneficiaries(filters: BeneficiaryFilters, pagination: any): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.country) {
      where.country = filters.country;
    }

    if (filters.city) {
      where.city = filters.city;
    }

    if (filters.riskScore !== undefined) {
      where.riskScore = { lte: filters.riskScore };
    }

    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { idDocumentNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [beneficiaries, total] = await Promise.all([
      prisma.beneficiary.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              status: true,
            },
          },
          _count: {
            select: {
              assignments: true,
              distributions: true,
            },
          },
        },
      }),
      prisma.beneficiary.count({ where }),
    ]);

    return {
      data: beneficiaries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getBeneficiaryById(id: string): Promise<any> {
    const beneficiary = await prisma.beneficiary.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            status: true,
          },
        },
        assignments: {
          include: {
            campaign: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
        },
        distributions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        kycSubmissions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!beneficiary) {
      throw new AppError('Beneficiary not found', 404);
    }

    return beneficiary;
  }

  static async updateBeneficiary(id: string, data: Partial<BeneficiaryInput>, userId: string, userRole: Role): Promise<any> {
    const beneficiary = await prisma.beneficiary.findUnique({
      where: { id },
    });

    if (!beneficiary) {
      throw new AppError('Beneficiary not found', 404);
    }

    // Check permissions
    if (beneficiary.userId !== userId && userRole !== Role.ADMIN && userRole !== Role.VERIFIER) {
      throw new AppError('You do not have permission to update this beneficiary', 403);
    }

    const updated = await prisma.beneficiary.update({
      where: { id },
      data,
    });

    logger.info(`Beneficiary updated: ${id} by user ${userId}`);

    return updated;
  }

  static async updateBeneficiaryStatus(id: string, status: BeneficiaryStatus, userId: string, userRole: Role): Promise<any> {
    const beneficiary = await prisma.beneficiary.findUnique({
      where: { id },
    });

    if (!beneficiary) {
      throw new AppError('Beneficiary not found', 404);
    }

    // Check permissions
    if (userRole !== Role.ADMIN && userRole !== Role.VERIFIER) {
      throw new AppError('You do not have permission to update beneficiary status', 403);
    }

    const updated = await prisma.beneficiary.update({
      where: { id },
      data: {
        status,
        verifiedAt: status === BeneficiaryStatus.VERIFIED ? new Date() : null,
        verifiedBy: status === BeneficiaryStatus.VERIFIED ? userId : null,
      },
    });

    logger.info(`Beneficiary status updated: ${id} to ${status} by user ${userId}`);

    return updated;
  }

  static async calculateRiskScore(beneficiaryId: string): Promise<number> {
    const beneficiary = await prisma.beneficiary.findUnique({
      where: { id: beneficiaryId },
      include: {
        kycSubmissions: {
          where: {
            status: {
              in: [KYCStatus.REJECTED, KYCStatus.EXPIRED],
            },
          },
        },
      },
    });

    if (!beneficiary) {
      throw new AppError('Beneficiary not found', 404);
    }

    let riskScore = 0;

    // Risk factors
    if (beneficiary.kycSubmissions.length > 2) {
      riskScore += 20;
    }

    if (beneficiary.familySize > 10) {
      riskScore += 10;
    }

    // Additional risk factors can be added here

    const updated = await prisma.beneficiary.update({
      where: { id: beneficiaryId },
      data: { riskScore },
    });

    return updated.riskScore;
  }

  static async submitKYC(beneficiaryId: string, data: any, userId: string): Promise<any> {
    const beneficiary = await prisma.beneficiary.findUnique({
      where: { id: beneficiaryId },
    });

    if (!beneficiary) {
      throw new AppError('Beneficiary not found', 404);
    }

    if (beneficiary.userId !== userId) {
      throw new AppError('You can only submit KYC for your own profile', 403);
    }

    const submission = await prisma.kYCSubmission.create({
      data: {
        userId,
        beneficiaryId,
        ...data,
        status: KYCStatus.PENDING,
      },
    });

    logger.info(`KYC submitted: ${submission.id} for beneficiary ${beneficiaryId}`);

    return submission;
  }

  static async reviewKYC(submissionId: string, status: KYCStatus, reviewNotes: string, userId: string, userRole: Role): Promise<any> {
    const submission = await prisma.kYCSubmission.findUnique({
      where: { id: submissionId },
      include: { beneficiary: true },
    });

    if (!submission) {
      throw new AppError('KYC submission not found', 404);
    }

    // Check permissions
    if (userRole !== Role.ADMIN && userRole !== Role.VERIFIER) {
      throw new AppError('You do not have permission to review KYC submissions', 403);
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Update submission
      const updatedSubmission = await tx.kYCSubmission.update({
        where: { id: submissionId },
        data: {
          status,
          reviewNotes,
          reviewedBy: userId,
          reviewedAt: new Date(),
        },
      });

      // Update beneficiary status if approved
      if (status === KYCStatus.APPROVED && submission.beneficiary) {
        await tx.beneficiary.update({
          where: { id: submission.beneficiaryId! },
          data: {
            status: BeneficiaryStatus.VERIFIED,
            verifiedAt: new Date(),
            verifiedBy: userId,
          },
        });
      } else if (status === KYCStatus.REJECTED && submission.beneficiary) {
        await tx.beneficiary.update({
          where: { id: submission.beneficiaryId! },
          data: {
            status: BeneficiaryStatus.REJECTED,
          },
        });
      }

      return updatedSubmission;
    });

    logger.info(`KYC reviewed: ${submissionId} with status ${status} by user ${userId}`);

    return updated;
  }
}
