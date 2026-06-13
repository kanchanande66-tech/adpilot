import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ActiveOrg = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.organizationId;
  },
);