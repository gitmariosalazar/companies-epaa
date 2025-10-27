import { Controller, Get } from '@nestjs/common';
import { AppService } from '../service/app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): {
    message: string;
  } {
    return this.appService.getHello();
  }

  @Get('health')
  getHealthCheck(): {
    status: string;
    timestamp: Date;
  } {
    return this.appService.getHealthCheck();
  }
}
