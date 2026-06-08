import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { ICurrentUser } from '../types/current-user.type'

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ICurrentUser => {
    const request = context.switchToHttp().getRequest()
    return request.user
  },
)
