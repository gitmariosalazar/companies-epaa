import { CompanyResponse } from "../../../../domain/schemas/dto/response/company.response";
import { CompanySQLResponse } from "../../../interfaces/sql/company.sql.response";

export class CompanyAdapter {
  static fromCompanySqlResponseToCompanyResponse(companySqlResponse: CompanySQLResponse): CompanyResponse {
    return {
      companyId: companySqlResponse.companyId,
      companyName: companySqlResponse.companyName,
      socialReason: companySqlResponse.socialReason,
      companyRuc: companySqlResponse.companyRuc,
      companyAddress: companySqlResponse.companyAddress,
      companyParishId: companySqlResponse.companyParishId,
      companyCountry: companySqlResponse.companyCountry,
      companyEmails: companySqlResponse.companyEmails,
      companyPhones: companySqlResponse.companyPhones,
      identificationType: companySqlResponse.identificationType,
    };
  }
}