import { Request } from 'express';
import { Role, User } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
  };
}

export interface JWTPayload {
  id: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export interface WalletAuthPayload {
  walletAddress: string;
  signature: string;
  message: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  username?: string;
  role?: Role;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string>;
}

export interface CampaignFilters {
  status?: string;
  organizationId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

export interface DonationFilters {
  campaignId?: string;
  userId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface BeneficiaryFilters {
  status?: string;
  country?: string;
  city?: string;
  riskScore?: number;
  search?: string;
}
