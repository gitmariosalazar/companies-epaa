import { CreateCompanyRequest } from "../../domain/schemas/dto/request/create.company.request";
import { UpdateCompanyRequest } from "../../domain/schemas/dto/request/update.company.request";
import { CompanyResponse } from "../../domain/schemas/dto/response/company.response";

export interface InterfaceCompanyUseCase {
  createCompany(company: CreateCompanyRequest): Promise<CompanyResponse | null>;
  updateCompany(companyRuc: string, company: Partial<UpdateCompanyRequest>): Promise<CompanyResponse | null>;
  getAllCompanies(limit: number, offset: number): Promise<CompanyResponse[] | null>;
  getCompanyByRuc(companyRuc: string): Promise<CompanyResponse | null>;
  deleteCompany(companyRuc: string): Promise<boolean>;
  verifyCompanyExists(companyRuc: string): Promise<boolean>;
}