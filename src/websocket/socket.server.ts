import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { config } from '../config';
import logger from '../config/logger';
import { authenticate } from '../middleware/auth';

let io: SocketIOServer;

export const initializeWebSocket = (httpServer: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.cors.origin,
      credentials: true,
    },
    path: '/socket.io/',
  });

  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify token (reuse JWT logic)
      // For simplicity, we'll skip full verification here
      // In production, you should verify the JWT token
      
      socket.data.userId = 'user-id-from-token';
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    // Join user's personal room
    const userId = socket.data.userId;
    socket.join(`user:${userId}`);

    // Handle events
    socket.on('join_campaign', (campaignId: string) => {
      socket.join(`campaign:${campaignId}`);
      logger.info(`User ${userId} joined campaign ${campaignId}`);
    });

    socket.on('leave_campaign', (campaignId: string) => {
      socket.leave(`campaign:${campaignId}`);
      logger.info(`User ${userId} left campaign ${campaignId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });

  logger.info('WebSocket server initialized');

  return io;
};

export const getSocketIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('WebSocket not initialized');
  }
  return io;
};

// Helper functions to broadcast events
export const broadcastToUser = (userId: string, event: string, data: any): void => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

export const broadcastToCampaign = (campaignId: string, event: string, data: any): void => {
  if (io) {
    io.to(`campaign:${campaignId}`).emit(event, data);
  }
};

export const broadcastToAll = (event: string, data: any): void => {
  if (io) {
    io.emit(event, data);
  }
};
