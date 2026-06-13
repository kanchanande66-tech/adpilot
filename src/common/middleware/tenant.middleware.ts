import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';

export interface TenantRequest extends Request {
  organizationId?: string;
  user?: any;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private jwtService: JwtService) {}

  use(req: TenantRequest, res: Response, next: NextFunction) {
    // Skip middleware for webhook routes that need raw body parsing or public routes
    if (req.path.startsWith('/webhooks/') || req.path.startsWith('/auth/')) {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Let JwtAuthGuard handle missing tokens
    }

    const token = authHeader.split(' ')[1];
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });
      
      if (!payload.organizationId) {
        throw new UnauthorizedException('Token missing organization context');
      }

      req.organizationId = payload.organizationId;
      req.user = payload;
      next();
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}