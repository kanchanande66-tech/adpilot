import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { UserModule } from './modules/user/user.module';
import { WebsiteModule } from './modules/website/website.module';
import { GoogleAdsModule } from './modules/google-ads/google-ads.module';
import { MetaAdsModule } from './modules/meta-ads/meta-ads.module';
import { CampaignBuilderModule } from './modules/campaign-builder/campaign-builder.module';
import { CopilotModule } from './modules/copilot/copilot.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { BillingModule } from './modules/billing/billing.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    OrganizationModule,
    UserModule,
    WebsiteModule,
    GoogleAdsModule,
    MetaAdsModule,
    CampaignBuilderModule,
    CopilotModule,
    ReportingModule,
    BillingModule,
    NotificationsModule,
    AnalyticsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .forRoutes('api/v1/*'); // Apply to all API routes except auth/webhooks
  }
}