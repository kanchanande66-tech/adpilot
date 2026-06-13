import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email, deletedAt: null },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const orgSlug = dto.organizationName 
        ? dto.organizationName.toLowerCase().replace(/\s+/g, '-') 
        : `org-${Date.now()}`;

      const organization = await tx.organization.create({
        data: {
          name: dto.organizationName || `${dto.name}'s Organization`,
          slug: orgSlug,
        },
      });

      let adminRole = await tx.role.findUnique({ where: { name: 'ORG_ADMIN' } });
      if (!adminRole) {
        adminRole = await tx.role.create({ data: { name: 'ORG_ADMIN', description: 'Organization Administrator' } });
      }

      const user = await tx.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          externalAuthId: `local_${Date.now()}`,
          password: hashedPassword,
          memberships: {
            create: {
              organizationId: organization.id,
              roleId: adminRole.id,
              status: 'ACTIVE',
              joinedAt: new Date(),
            },
          },
        },
        include: {
          memberships: {
            include: { role: true },
          },
        },
      });

      return { user, organization };
    });

    return this.generateTokens(result.user, result.organization.id);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email, deletedAt: null },
      include: {
        memberships: {
          include: { role: true, organization: true },
        },
      },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.password!))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const activeMembership = user.memberships.find(m => m.status === 'ACTIVE');
    if (!activeMembership) {
      throw new UnauthorizedException('No active organization membership found');
    }

    return this.generateTokens(user, activeMembership.organizationId);
  }

  private async generateTokens(user: any, organizationId: string) {
    const payload = {
      sub: user.id,
      email: user.email,
      organizationId,
      role: user.memberships.find((m: any) => m.organizationId === organizationId)?.role.name,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '15m' }),
      this.jwtService.signAsync(payload, { expiresIn: '7d' }),
    ]);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organizationId,
      },
    };
  }
}