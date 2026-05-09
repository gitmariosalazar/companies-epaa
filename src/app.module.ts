import { Module } from '@nestjs/common';
import { AppController } from './app/controller/app.controller';
import { AppService } from './app/service/app.service';
import { HomeModule } from './app/module/home.module';
import { AppCompaniesModulesUsingPostgreSQL } from './factory/postgresql/modules-using-postgresql.module';
import { AppCompaniesModulesUsingMySQL } from './factory/mysql/modules-using-mysql.module';
import { environments } from './settings/environments/environments';
import { DatabasePersistenceModule } from './shared/connections/database/database-persistence.module';

const companiesModules = environments.DATABASE_TYPE === 'mysql'
  ? AppCompaniesModulesUsingMySQL
  : AppCompaniesModulesUsingPostgreSQL;

@Module({
  imports: [
    HomeModule, 
    companiesModules,
    DatabasePersistenceModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
