
import { CompanyResponse } from "../schemas/dto/response/company.response";
import { CompanyModel } from "../schemas/model/company.model";

export interface InterfaceCompanyRepository {
  createCompany(company: CompanyModel): Promise<CompanyResponse | null>;
  updateCompany(companyRuc: string, company: CompanyModel): Promise<CompanyResponse | null>;
  getAllCompanies(limit: number, offset: number): Promise<CompanyResponse[] | null>;
  getCompanyByRuc(companyRuc: string): Promise<CompanyResponse | null>;
  deleteCompany(companyRuc: string): Promise<boolean>;
  verifyCompanyExists(companyRuc: string): Promise<boolean>;
}