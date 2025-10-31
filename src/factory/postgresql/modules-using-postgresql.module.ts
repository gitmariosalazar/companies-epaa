import { Module } from "@nestjs/common";
import { PostgreSQLCompanyModule } from "../../modules/company/infrastructure/modules/postgresql/postgresql.company.module";

@Module({
  imports: [PostgreSQLCompanyModule],
  controllers: [],
  providers: [],
  exports: []
})
export class AppCompaniesModulesUsingPostgreSQL { }