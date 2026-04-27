import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { AuthenticatedUser } from '../strategies/jwt.strategy'

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest()
    return request.user
  },
)
