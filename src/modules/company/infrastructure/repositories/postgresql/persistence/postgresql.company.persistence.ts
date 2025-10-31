import { Injectable } from '@nestjs/common';
import { InterfaceCompanyRepository } from '../../../../domain/contracts/company.interface.repository';
import { DatabaseServicePostgreSQL } from '../../../../../../shared/connections/database/postgresql/postgresql.service';
import { CompanyResponse } from '../../../../domain/schemas/dto/response/company.response';
import { CompanyModel } from '../../../../domain/schemas/model/company.model';
import { th } from 'date-fns/locale';
import { RpcException } from '@nestjs/microservices';
import { statusCode } from '../../../../../../settings/environments/status-code';
import { CompanySQLResponse } from '../../../interfaces/sql/company.sql.response';
import { CompanyAdapter } from '../adapters/company.adapter';

@Injectable()
export class PostgreSQLCompanyPersistence
  implements InterfaceCompanyRepository {
  constructor(private readonly postgreSqlService: DatabaseServicePostgreSQL) { }

  async createCompany(company: CompanyModel): Promise<CompanyResponse | null> {
    try {

      return this.postgreSqlService.transaction(async (client) => {
        // 1. Insertar en Cliente
        const insertClientQuery = `
      INSERT INTO Cliente (clienteId, tipoIdentificacionId, clienteIdValido)
      VALUES ($1, $2, $3)
      RETURNING clienteId;
    `;
        const clienteResult = await client.query(insertClientQuery, [
          company['companyRuc'],
          company['identificationType'],
          'CED_VALID',
        ]);
        const clienteId = clienteResult.rows[0].clienteid;

        // 2. Insertar en Empresa
        const insertCompanyQuery = `
      INSERT INTO Empresa (
        nombreComercial, razonSocial, ruc, direccion, parroquiaId,
        clienteId, pais
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING empresaId;
    `;
        const companyResult = await client.query(insertCompanyQuery, [
          company['companyName'],
          company['socialReason'],
          company['companyRuc'],
          company['companyAddress'],
          company['companyParishId'],
          clienteId,
          company['companyCountry'],
        ]);

        const companyId = companyResult.rows[0].empresaId; // Asumimos que companyId es igual a clienteId
        // 4️⃣ Insertar Correos
        const insertCorreoQuery = `
      INSERT INTO Correo (email, clienteId)
      VALUES ($1, $2);
    `;
        for (const email of company['companyEmails']) {
          await client.query(insertCorreoQuery, [email, clienteId]);
        }

        // 5️⃣ Insertar Teléfonos
        const insertTelefonoQuery = `
      INSERT INTO Telefono (clienteId, numero, tipoTelefonoId, esValido)
      VALUES ($1, $2, $3, $4);
    `;
        for (const numero of company['companyPhones']) {
          await client.query(insertTelefonoQuery, [clienteId, numero, 1, true]);
        }

        const selectQuery = `
      SELECT
          e.empresaid AS "companyId",
          e.nombrecomercial AS "companyName",
          e.razonsocial AS "socialReason",
          e.ruc AS "companyRuc",
          e.direccion AS "companyAddress",
          e.parroquiaid AS "companyParishId",
          e.pais AS "companyCountry",
          COALESCE(cc.emails, '{}') AS "companyEmails",
          COALESCE(cc.phones, '{}') AS "companyPhones",
          cl.tipoidentificacionid AS "identificationType"
      FROM cliente cl
      INNER JOIN empresa e ON e.clienteid = cl.clienteid
      LEFT JOIN cliente_contacto cc ON cc.clienteid = cl.clienteid
      WHERE cl.clienteid = $1;
    `;

        const selectResult = await client.query<CompanySQLResponse>(
          selectQuery,
          [company['companyRuc']],
        );

        const response =
          CompanyAdapter.fromCompanySqlResponseToCompanyResponse(
            selectResult.rows[0],
          );
        return response;
      });
    } catch (error) {
      throw error;
    }
  }

  async verifyCompanyExists(companyRuc: string): Promise<boolean> {
    try {
      const query = `
      SELECT 1 FROM Empresa WHERE ruc = $1 LIMIT 1;
    `;
      const result = await this.postgreSqlService.query(query, [companyRuc]);
      return result.length > 0;
    } catch (error) {
      throw error;
    }
  }

  async updateCompany(
    companyRuc: string,
    company: CompanyModel,
  ): Promise<CompanyResponse | null> {
    try {
      return this.postgreSqlService.transaction(async (client) => {
        // Actualizar Empresa
        const updateCompanyQuery = `
      UPDATE Empresa
      SET nombreComercial = $1,
          razonSocial = $2,
          direccion = $3,
          parroquiaId = $4,
          pais = $5
      WHERE ruc = $6
      RETURNING empresaId;
    `;
        const companyResult = await client.query(updateCompanyQuery, [
          company['companyName'],
          company['socialReason'],
          company['companyAddress'],
          company['companyParishId'],
          company['companyCountry'],
          companyRuc,
        ]);

        // Actualizar Correos
        const deleteEmailsQuery = `
      DELETE FROM Correo WHERE clienteId = $1;
    `;
        await client.query(deleteEmailsQuery, [companyRuc]);

        const insertEmailQuery = `
      INSERT INTO Correo (email, clienteId)
      VALUES ($1, $2);
    `;
        for (const email of company['companyEmails']) {
          await client.query(insertEmailQuery, [email, companyRuc]);
        }

        // Actualizar Teléfonos
        const deletePhonesQuery = `
      DELETE FROM Telefono WHERE clienteId = $1;
    `;
        await client.query(deletePhonesQuery, [companyRuc]);

        const insertPhoneQuery = `
      INSERT INTO Telefono (clienteId, numero, tipoTelefonoId, esValido)
      VALUES ($1, $2, $3, $4);
    `;
        for (const numero of company['companyPhones']) {
          await client.query(insertPhoneQuery, [companyRuc, numero, 1, true]);
        }

        // Verificar si la empresa fue actualizada

        if (companyResult.rowCount === 0) {
          throw new RpcException({
            statusCode: statusCode.NOT_FOUND,
            message: `Company with RUC ${companyRuc} not found.`,
          });
        }

        const selectQuery = `
      SELECT
          e.empresaid AS "companyId",
          e.nombrecomercial AS "companyName",
          e.razonsocial AS "socialReason",
          e.ruc AS "companyRuc",
          e.direccion AS "companyAddress",
          e.parroquiaid AS "companyParishId",
          e.pais AS "companyCountry",
          COALESCE(cc.emails, '{}') AS "companyEmails",
          COALESCE(cc.phones, '{}') AS "companyPhones",
          cl.tipoidentificacionid AS "identificationType"
      FROM cliente cl
      INNER JOIN empresa e ON e.clienteid = cl.clienteid
      LEFT JOIN cliente_contacto cc ON cc.clienteid = cl.clienteid
      WHERE cl.clienteid = $1;
    `;

        const selectResult = await client.query<CompanySQLResponse>(
          selectQuery,
          [company['companyRuc']],
        );

        const response =
          CompanyAdapter.fromCompanySqlResponseToCompanyResponse(
            selectResult.rows[0],
          );
        return response;
      });
    } catch (error) {
      throw error;
    }
  }

  async getCompanyByRuc(companyRuc: string): Promise<CompanyResponse | null> {
    try {
      const query = `
      SELECT
          e.empresaid AS "companyId",
          e.nombrecomercial AS "companyName",
          e.razonsocial AS "socialReason",
          e.ruc AS "companyRuc",
          e.direccion AS "companyAddress",
          e.parroquiaid AS "companyParishId",
          e.pais AS "companyCountry",
          COALESCE(cc.emails, '{}') AS "companyEmails",
          COALESCE(cc.phones, '{}') AS "companyPhones",
          cl.tipoidentificacionid AS "identificationType"
      FROM cliente cl
      INNER JOIN empresa e ON e.clienteid = cl.clienteid
      LEFT JOIN cliente_contacto cc ON cc.clienteid = cl.clienteid
      WHERE cl.clienteid = $1;
    `;
      const result = await this.postgreSqlService.query<CompanySQLResponse>(
        query,
        [companyRuc],
      );
      if (result.length === 0) {
        throw new RpcException({
          statusCode: statusCode.NOT_FOUND,
          message: `Company with RUC ${companyRuc} not found.`,
        });
      }

      const companyResult =
        CompanyAdapter.fromCompanySqlResponseToCompanyResponse(result[0]);
      return companyResult;
    } catch (error) {
      throw error;
    }
  }

  async getAllCompanies(
    limit: number,
    offset: number,
  ): Promise<CompanyResponse[] | null> {
    try {
      const query = `
      SELECT
          e.empresaid AS "companyId",
          e.nombrecomercial AS "companyName",
          e.razonsocial AS "socialReason",
          e.ruc AS "companyRuc",
          e.direccion AS "companyAddress",
          e.parroquiaid AS "companyParishId",
          e.pais AS "companyCountry",
          COALESCE(cc.emails, '{}') AS "companyEmails",
          COALESCE(cc.phones, '{}') AS "companyPhones",
          cl.tipoidentificacionid AS "identificationType"
      FROM cliente cl
      INNER JOIN empresa e ON e.clienteid = cl.clienteid
      LEFT JOIN cliente_contacto cc ON cc.clienteid = cl.clienteid
      LIMIT $1 OFFSET $2;
    `;
      const result = await this.postgreSqlService.query<CompanySQLResponse>(
        query,
        [limit, offset],
      );
      const companies: CompanyResponse[] = result.map((companySqlResponse) =>
        CompanyAdapter.fromCompanySqlResponseToCompanyResponse(
          companySqlResponse,
        ),
      );
      return companies;
    } catch (error) {
      throw error;
    }
  }

  async deleteCompany(companyRuc: string): Promise<boolean> {
    try {
      const query = `
      DELETE FROM empresa
      WHERE ruc = $1
      RETURNING *;
    `;
      const result = await this.postgreSqlService.query(query, [companyRuc]);
      return result.length > 0;
    } catch (error) {
      throw error;
    }
  }
}
