import { Module } from '@nestjs/common';
import { MySQLCompanyModule } from '../../modules/company/infrastructure/modules/mysql/mysql.company.module';

@Module({
  imports: [MySQLCompanyModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class AppCompaniesModulesUsingMySQL {}
