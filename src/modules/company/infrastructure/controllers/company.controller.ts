import { Controller, Get, Post, Put } from "@nestjs/common";
import { CompanyService } from "../../application/services/company.service";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { CreateCompanyRequest } from "../../domain/schemas/dto/request/create.company.request";
import { UpdateCompanyRequest } from "../../domain/schemas/dto/request/update.company.request";

@Controller('companies')
export class CompanyController {
  constructor(
    private readonly companyService: CompanyService,
  ) { }

  @Post('create-company')
  @MessagePattern('companies.create-company')
  async createCompany(@Payload() company: CreateCompanyRequest) {
    return this.companyService.createCompany(company);
  }

  @Put('update-company/:companyRuc')
  @MessagePattern('companies.update-company')
  async updateCompany(@Payload() data: { companyRuc: string; company: UpdateCompanyRequest }) {
    return this.companyService.updateCompany(data.companyRuc, data.company);
  }

  @Get('get-company/:companyRuc')
  @MessagePattern('companies.get-company-by-ruc')
  async getCompanyByRuc(@Payload() companyRuc: string) {
    return this.companyService.getCompanyByRuc(companyRuc);
  }

  @Get('get-all-companies')
  @MessagePattern('companies.get-all-companies')
  async getAllCompanies(@Payload() data: { limit?: number; offset?: number }) {
    const limit = data?.limit ?? 100;
    const offset = data?.offset ?? 0;
    return await this.companyService.getAllCompanies(limit, offset);
  }

  @Put('delete-company/:companyRuc')
  @MessagePattern('companies.delete-company')
  async deleteCompany(@Payload() companyRuc: string) {
    return this.companyService.deleteCompany(companyRuc);
  }

  @Get('verify-company-exists/:companyRuc')
  @MessagePattern('companies.verify-company-exists')
  async verifyCompanyExists(@Payload() companyRuc: string) {
    return this.companyService.verifyCompanyExists(companyRuc);
  }
}