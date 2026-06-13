import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogPayload {
  userId: string | null;
  organizationId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  payload: any;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(data: AuditLogPayload) {
    await this.prisma.auditLog.create({
      data: {
        userId: data.userId,
        organizationId: data.organizationId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        payload: data.payload,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }
}