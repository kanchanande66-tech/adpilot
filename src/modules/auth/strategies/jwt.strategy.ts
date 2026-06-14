import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'fallback-dev-secret-change-in-prod',
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub, deletedAt: null },
      include: {
        memberships: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or deleted');
    }

    const membership = user.memberships.find(
      (m: any) => m.organizationId === payload.organizationId && m.status === 'ACTIVE'
    );

    if (!membership) {
      throw new UnauthorizedException('User does not have active access to this organization');
    }

    return {
      userId: user.id,
      email: user.email,
      organizationId: payload.organizationId,
      role: membership.role.name,
    };
  }
}