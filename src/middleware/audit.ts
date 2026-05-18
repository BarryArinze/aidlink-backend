import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuditAction } from '@prisma/client';
import logger from '../config/logger';

export const auditLog = (action: AuditAction) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalSend = res.json;
    
    res.json = function (data: any) {
      // Log the audit entry after response is sent
      setImmediate(async () => {
        try {
          const userId = (req as any).user?.id;
          const ipAddress = req.ip || req.connection.remoteAddress;
          const userAgent = req.get('user-agent');

          await prisma.auditLog.create({
            data: {
              userId,
              action,
              entityType: req.route?.path?.split('/')[1] || 'UNKNOWN',
              entityId: req.params.id,
              changes: {
                body: req.body,
                query: req.query,
              },
              ipAddress,
              userAgent,
            },
          });
        } catch (error) {
          logger.error('Failed to create audit log:', error);
        }
      });

      return originalSend.call(this, data);
    };

    next();
  };
};
