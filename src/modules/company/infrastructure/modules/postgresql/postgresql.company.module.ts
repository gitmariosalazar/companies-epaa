import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { environments } from "../../../../../settings/environments/environments";
import { CompanyController } from "../../controllers/company.controller";
import { CompanyService } from "../../../application/services/company.service";
import { PostgreSQLCompanyPersistence } from "../../repositories/postgresql/persistence/postgresql.company.persistence";
import { DatabasePersistenceModule } from "../../../../../shared/connections/database/database-persistence.module";

@Module({
  imports: [
    DatabasePersistenceModule,
    ClientsModule.register([
      {
        name: environments.COMPANIES_KAFKA_CLIENT,
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: environments.COMPANIES_KAFKA_CLIENT_ID,
            brokers: [environments.KAFKA_BROKER_URL],
          },
          consumer: {
            groupId: environments.COMPANIES_KAFKA_GROUP_ID,
            allowAutoTopicCreation: true,
          },
        }
      }
    ])
  ],
  controllers: [CompanyController],
  providers: [
    CompanyService,
    {
      provide: 'CompanyRepository',
      useClass: PostgreSQLCompanyPersistence
    }
  ],
  exports: []
})
export class PostgreSQLCompanyModule { }