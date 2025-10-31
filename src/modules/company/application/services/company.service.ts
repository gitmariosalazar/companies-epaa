import { Inject, Injectable } from '@nestjs/common';
import { InterfaceCompanyUseCase } from '../usecases/company.use-case.interface';
import { InterfaceCompanyRepository } from '../../domain/contracts/company.interface.repository';
import { CompanyResponse } from '../../domain/schemas/dto/response/company.response';
import { CompanyModel } from '../../domain/schemas/model/company.model';
import { validateFields } from '../../../../shared/validators/fields.validators';
import { RpcException } from '@nestjs/microservices';
import { CompanyMapper } from '../mappers/company.mapper';
import { CreateCompanyRequest } from '../../domain/schemas/dto/request/create.company.request';
import { statusCode } from '../../../../settings/environments/status-code';
import { UpdateCompanyRequest } from '../../domain/schemas/dto/request/update.company.request';

@Injectable()
export class CompanyService implements InterfaceCompanyUseCase {
  constructor(
    @Inject('CompanyRepository')
    private readonly companyRepository: InterfaceCompanyRepository,
  ) { }

  async verifyCompanyExists(companyRuc: string): Promise<boolean> {
    return this.companyRepository.verifyCompanyExists(companyRuc);
  }

  async createCompany(
    company: CreateCompanyRequest,
  ): Promise<CompanyResponse | null> {
    try {
      const requiredFields: string[] = [
        'companyName',
        'socialReason',
        'companyRuc',
        'companyAddress',
        'companyParishId',
        'companyCountry',
        'companyEmails',
        'companyPhones',
        'identificationType',
      ];

      const missingFieldsMessages: string[] = validateFields(
        company,
        requiredFields,
      );

      if (missingFieldsMessages.length > 0) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: missingFieldsMessages,
        });
      }

      const verifyCompanyExists =
        await this.companyRepository.verifyCompanyExists(company.companyRuc);

      if (verifyCompanyExists) {
        throw new RpcException({
          statusCode: statusCode.CONFLICT,
          message: `Company with RUC ${company.companyRuc} already exists.`,
        });
      }

      const companyModel: CompanyModel =
        CompanyMapper.fromCreateCompanyRequestToCompanyModel(company, 0);

      const createdCompany =
        await this.companyRepository.createCompany(companyModel);

      if (!createdCompany || createdCompany === null) {
        throw new RpcException({
          statusCode: statusCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to create company.',
        });
      }

      return createdCompany;
    } catch (error) {
      throw error;
    }
  }

  async updateCompany(
    companyRuc: string,
    company: Partial<UpdateCompanyRequest>,
  ): Promise<CompanyResponse | null> {
    try {
      if (!companyRuc || companyRuc.trim() === '') {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: 'Company ID is required.',
        });
      }

      const existingCompany =
        await this.companyRepository.verifyCompanyExists(companyRuc);

      if (!existingCompany) {
        throw new RpcException({
          statusCode: statusCode.NOT_FOUND,
          message: `Company with ID ${companyRuc} not found.`,
        });
      }

      const requiredFields: string[] = [
        'companyName',
        'socialReason',
        'companyRuc',
        'companyAddress',
        'companyParishId',
        'companyCountry',
        'companyEmails',
        'companyPhones',
        'identificationType',
      ];

      const missingFieldsMessages: string[] = validateFields(
        company,
        requiredFields,
      );

      if (missingFieldsMessages.length > 0) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: missingFieldsMessages,
        });
      }

      const updatedCompany: CompanyModel =
        CompanyMapper.fromUpdateCompanyRequestToCompanyModel(0, company);

      const result = await this.companyRepository.updateCompany(
        companyRuc,
        updatedCompany,
      );

      if (!result) {
        throw new RpcException({
          statusCode: statusCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to update company.',
        });
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  async getCompanyByRuc(companyRuc: string): Promise<CompanyResponse | null> {
    try {
      if (!companyRuc || companyRuc.trim() === '') {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: 'Company RUC is required.',
        });
      }

      const verifyCompanyExists =
        await this.companyRepository.verifyCompanyExists(companyRuc);

      if (!verifyCompanyExists) {
        throw new RpcException({
          statusCode: statusCode.NOT_FOUND,
          message: `Company with RUC ${companyRuc} not found.`,
        });
      }

      const company = await this.companyRepository.getCompanyByRuc(companyRuc);
      return company;
    } catch (error) {
      throw error;
    }
  }

  async getAllCompanies(
    limit: number,
    offset: number,
  ): Promise<CompanyResponse[] | null> {
    try {
      const companies = await this.companyRepository.getAllCompanies(
        limit,
        offset,
      );

      if (!companies || companies.length === 0) {
        throw new RpcException({
          statusCode: statusCode.NOT_FOUND,
          message: 'No companies found.',
        });
      }

      return companies;
    } catch (error) {
      throw error;
    }
  }

  async deleteCompany(companyRuc: string): Promise<boolean> {
    try {
      if (!companyRuc || companyRuc.trim() === '') {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: 'Company RUC is required.',
        });
      }

      const verifyCompanyExists =
        await this.companyRepository.verifyCompanyExists(companyRuc);

      if (!verifyCompanyExists) {
        throw new RpcException({
          statusCode: statusCode.NOT_FOUND,
          message: `Company with RUC ${companyRuc} not found.`,
        });
      }

      const result = await this.companyRepository.deleteCompany(companyRuc);
      return result;
    } catch (error) {
      throw error;
    }
  }
}
