import { Injectable } from '@nestjs/common';
import { InterfaceCompanyRepository } from '../../../../domain/contracts/company.interface.repository';
import { CompanyResponse } from '../../../../domain/schemas/dto/response/company.response';
import { CompanyModel } from '../../../../domain/schemas/model/company.model';
import { RpcException } from '@nestjs/microservices';
import { statusCode } from '../../../../../../settings/environments/status-code';
import { CompanySQLResponse } from '../../../interfaces/sql/company.sql.response';
import { CompanyAdapter } from '../../../adapters/company.adapter';
import { DatabaseAbstract, IDatabaseClient } from '../../../../../../shared/connections/database/abstract/abstract.database';

@Injectable()
export class PostgreSQLCompanyPersistence implements InterfaceCompanyRepository {
  constructor(private readonly databaseService: DatabaseAbstract) {}

  async createCompany(company: CompanyModel): Promise<CompanyResponse | null> {
    try {
      return this.databaseService.transaction(async (client: IDatabaseClient) => {
        // 1. Insertar en Cliente — idempotente: auth puede haberlo creado antes
        const insertClientQuery = `
          INSERT INTO cliente (cliente_id, tipo_identificacion_id, cliente_id_valido)
          VALUES (?, ?, ?)
          ON CONFLICT (cliente_id) DO NOTHING;
        `;
        await client.query(insertClientQuery, [
          company['companyRuc'],
          company['identificationType'],
          'CED_VALID',
        ]);
        const clienteId = company['companyRuc'];

        // 2. Insertar/actualizar en Empresa — idempotente:
        //    Si auth creó un placeholder ('SIN DIRECCION'), aquí se actualizan los datos reales.
        const upsertCompanyQuery = `
          INSERT INTO empresa (
            nombre_comercial, razon_social, ruc, direccion, parroquia_id,
            cliente_id, pais
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (ruc) DO UPDATE SET
            nombre_comercial = EXCLUDED.nombre_comercial,
            razon_social     = EXCLUDED.razon_social,
            direccion        = EXCLUDED.direccion,
            parroquia_id     = EXCLUDED.parroquia_id,
            pais             = EXCLUDED.pais;
        `;
        await client.query(upsertCompanyQuery, [
          company['companyName'],
          company['socialReason'],
          company['companyRuc'],
          company['companyAddress'],
          company['companyParishId'],
          clienteId,
          company['companyCountry'],
        ]);

        // 3. Insertar Correos — limpia primero para evitar duplicados
        const deleteCorreosQuery = `DELETE FROM correo_electronico WHERE cliente_id = ?;`;
        await client.query(deleteCorreosQuery, [clienteId]);

        const insertCorreoQuery = `
          INSERT INTO correo_electronico (email, cliente_id)
          VALUES (?, ?);
        `;
        for (const email of company['companyEmails']) {
          await client.query(insertCorreoQuery, [email, clienteId]);
        }

        // 4. Insertar Teléfonos — limpia primero para evitar duplicados
        const deleteTelefonosQuery = `DELETE FROM telefono WHERE cliente_id = ?;`;
        await client.query(deleteTelefonosQuery, [clienteId]);

        const insertTelefonoQuery = `
          INSERT INTO telefono (cliente_id, numero, tipo_telefono_id, es_valido)
          VALUES (?, ?, ?, ?);
        `;
        for (const numero of company['companyPhones']) {
          await client.query(insertTelefonoQuery, [clienteId, numero, 1, true]);
        }

        const selectQuery = `
          SELECT
              e.empresa_id AS "companyId",
              e.nombre_comercial AS "companyName",
              e.razon_social AS "socialReason",
              e.ruc AS "companyRuc",
              e.direccion AS "companyAddress",
              e.parroquia_id AS "companyParishId",
              e.pais AS "companyCountry",
              COALESCE(cc.correos, '[]'::json) AS "companyEmails",
              COALESCE(cc.phones, '[]'::json) AS "companyPhones",
              cl.tipo_identificacion_id AS "identificationType"
          FROM cliente cl
          INNER JOIN empresa e ON e.cliente_id = cl.cliente_id
          LEFT JOIN cliente_contacto cc ON cc.cliente_id = cl.cliente_id
          WHERE cl.cliente_id = ?;
        `;

        const rows = await client.query<CompanySQLResponse>(selectQuery, [company['companyRuc']]);

        return CompanyAdapter.fromCompanySqlResponseToCompanyResponse(rows[0]);
      });
    } catch (error) {
      throw error;
    }
  }

  async verifyCompanyExists(companyRuc: string): Promise<boolean> {
    try {
      const query = `SELECT 1 FROM empresa WHERE ruc = ? LIMIT 1;`;
      const result = await this.databaseService.query(query, [companyRuc]);
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
      return this.databaseService.transaction(async (client: IDatabaseClient) => {
        // Actualizar Empresa
        const updateCompanyQuery = `
          UPDATE empresa
          SET nombre_comercial = ?,
              razon_social = ?,
              direccion = ?,
              parroquia_id = ?,
              pais = ?
          WHERE ruc = ?;
        `;
        const { affectedRows: rowCount } = await client.execute(updateCompanyQuery, [
          company['companyName'],
          company['socialReason'],
          company['companyAddress'],
          company['companyParishId'],
          company['companyCountry'],
          companyRuc,
        ]);

        if (rowCount === 0) {
          throw new RpcException({
            statusCode: statusCode.NOT_FOUND,
            message: `Company with RUC ${companyRuc} not found.`,
          });
        }

        // Actualizar Correos
        const deleteEmailsQuery = `DELETE FROM correo_electronico WHERE cliente_id = ?;`;
        await client.query(deleteEmailsQuery, [companyRuc]);

        const insertEmailQuery = `
          INSERT INTO correo_electronico (email, cliente_id)
          VALUES (?, ?);
        `;
        for (const email of company['companyEmails']) {
          await client.query(insertEmailQuery, [email, companyRuc]);
        }

        // Actualizar Teléfonos
        const deletePhonesQuery = `DELETE FROM telefono WHERE cliente_id = ?;`;
        await client.query(deletePhonesQuery, [companyRuc]);

        const insertPhoneQuery = `
          INSERT INTO telefono (cliente_id, numero, tipo_telefono_id, es_valido)
          VALUES (?, ?, ?, ?);
        `;
        for (const numero of company['companyPhones']) {
          await client.query(insertPhoneQuery, [companyRuc, numero, 1, true]);
        }

        const selectQuery = `
          SELECT
              e.empresa_id AS "companyId",
              e.nombre_comercial AS "companyName",
              e.razon_social AS "socialReason",
              e.ruc AS "companyRuc",
              e.direccion AS "companyAddress",
              e.parroquia_id AS "companyParishId",
              e.pais AS "companyCountry",
              COALESCE(cc.correos, '[]'::json) AS "companyEmails",
              COALESCE(cc.phones, '[]'::json) AS "companyPhones",
              cl.tipo_identificacion_id AS "identificationType"
          FROM cliente cl
          INNER JOIN empresa e ON e.cliente_id = cl.cliente_id
          LEFT JOIN cliente_contacto cc ON cc.cliente_id = cl.cliente_id
          WHERE cl.cliente_id = ?;
        `;

        const rows = await client.query<CompanySQLResponse>(selectQuery, [companyRuc]);

        return CompanyAdapter.fromCompanySqlResponseToCompanyResponse(rows[0]);
      });
    } catch (error) {
      throw error;
    }
  }

  async getCompanyByRuc(companyRuc: string): Promise<CompanyResponse | null> {
    try {
      const query = `
        SELECT
            e.empresa_id AS "companyId",
            e.nombre_comercial AS "companyName",
            e.razon_social AS "socialReason",
            e.ruc AS "companyRuc",
            e.direccion AS "companyAddress",
            e.parroquia_id AS "companyParishId",
            e.pais AS "companyCountry",
            COALESCE(cc.correos, '[]'::json) AS "companyEmails",
            COALESCE(cc.phones, '[]'::json) AS "companyPhones",
            cl.tipo_identificacion_id AS "identificationType"
        FROM cliente cl
        INNER JOIN empresa e ON e.cliente_id = cl.cliente_id
        LEFT JOIN cliente_contacto cc ON cc.cliente_id = cl.cliente_id
        WHERE cl.cliente_id = ?;
      `;
      const result = await this.databaseService.query<CompanySQLResponse>(query, [companyRuc]);
      if (result.length === 0) {
        throw new RpcException({
          statusCode: statusCode.NOT_FOUND,
          message: `Company with RUC ${companyRuc} not found.`,
        });
      }

      return CompanyAdapter.fromCompanySqlResponseToCompanyResponse(result[0]);
    } catch (error) {
      throw error;
    }
  }

  async getAllCompanies(limit: number, offset: number): Promise<CompanyResponse[] | null> {
    try {
      const query = `
        SELECT
            e.empresa_id AS "companyId",
            e.nombre_comercial AS "companyName",
            e.razon_social AS "socialReason",
            e.ruc AS "companyRuc",
            e.direccion AS "companyAddress",
            e.parroquia_id AS "companyParishId",
            e.pais AS "companyCountry",
            COALESCE(cc.correos, '[]'::json) AS "companyEmails",
            COALESCE(cc.phones, '[]'::json) AS "companyPhones",
            cl.tipo_identificacion_id AS "identificationType"
        FROM cliente cl
        INNER JOIN empresa e ON e.cliente_id = cl.cliente_id
        LEFT JOIN cliente_contacto cc ON cc.cliente_id = cl.cliente_id
        LIMIT ? OFFSET ?;
      `;
      const result = await this.databaseService.query<CompanySQLResponse>(query, [limit, offset]);
      return result.map((company) => CompanyAdapter.fromCompanySqlResponseToCompanyResponse(company));
    } catch (error) {
      throw error;
    }
  }

  async deleteCompany(companyRuc: string): Promise<boolean> {
    try {
      const query = `DELETE FROM empresa WHERE ruc = ?;`;
      const result = await this.databaseService.execute(query, [companyRuc]);
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }
}
