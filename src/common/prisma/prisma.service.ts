import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async findUniqueOrThrowWithTenant(model: any, args: any, orgId: string) {
    return this[model].findUniqueOrThrow({
      ...args,
      where: {
        ...args.where,
        organizationId: orgId,
        deletedAt: null,
      },
    });
  }
}