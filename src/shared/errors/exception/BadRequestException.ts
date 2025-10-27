import { HttpException, HttpStatus } from '@nestjs/common';

export class BadRequestException extends HttpException {
  constructor(message: string[], errorCode?: number) {
    super(
      message,
      HttpStatus.BAD_REQUEST,
    );
  }
}
