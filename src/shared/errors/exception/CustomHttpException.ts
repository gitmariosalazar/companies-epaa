import { HttpException } from '@nestjs/common';

export class CustomHttpException extends HttpException {
  constructor(message: string, errorCode: number) {
    super(message, errorCode);
  }
}
