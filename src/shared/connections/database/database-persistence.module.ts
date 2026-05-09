import { Module, Global } from '@nestjs/common';
import { DatabaseAbstract } from './abstract/abstract.database';
import { DatabaseServicePostgreSQL } from './postgresql/postgresql.service';
import { DatabaseServiceMySQL } from './mysql/mysql.service';
import { environments } from '../../../settings/environments/environments';

const databaseProvider = {
  provide: DatabaseAbstract,
  useExisting: environments.DATABASE_TYPE === 'mysql' 
    ? DatabaseServiceMySQL 
    : DatabaseServicePostgreSQL,
};

const providers = environments.DATABASE_TYPE === 'mysql'
  ? [DatabaseServiceMySQL, databaseProvider]
  : [DatabaseServicePostgreSQL, databaseProvider];

@Global()
@Module({
  providers: providers,
  exports: [DatabaseAbstract],
})
export class DatabasePersistenceModule {}
