import { CreateCompanyRequest } from "../../domain/schemas/dto/request/create.company.request";
import { UpdateCompanyRequest } from "../../domain/schemas/dto/request/update.company.request";
import { CompanyResponse } from "../../domain/schemas/dto/response/company.response";
import { CompanyModel } from "../../domain/schemas/model/company.model";

export class CompanyMapper {
  static fromCreateCompanyRequestToCompanyModel(request: CreateCompanyRequest, companyId: number): CompanyModel {
    return new CompanyModel(
      companyId,
      request.companyName,
      request.socialReason,
      request.companyRuc,
      request.companyAddress,
      request.companyParishId,
      request.companyCountry,
      request.companyEmails,
      request.companyPhones,
      request.identificationType
    );
  }

  static fromUpdateCompanyRequestToCompanyModel(companyId: number, request: Partial<UpdateCompanyRequest>): CompanyModel {
    return new CompanyModel(
      companyId,
      request.companyName ?? "",
      request.socialReason ?? "",
      request.companyRuc ?? "",
      request.companyAddress ?? "",
      request.companyParishId ?? "",
      request.companyCountry ?? "",
      request.companyEmails ?? [],
      request.companyPhones ?? [],
      request.identificationType ?? ""
    );
  }

  static fromCompanyModelToResponse(model: CompanyModel): CompanyResponse {
    return {
      companyId: model.getCompanyId(),
      companyName: model.getCompanyName(),
      socialReason: model.getCompanySocialReason(),
      companyRuc: model.getCompanyRuc(),
      companyAddress: model.getCompanyAddress(),
      companyParishId: model.getCompanyParishId(),
      companyCountry: model.getCompanyCountry(),
      companyEmails: model.getCompanyEmails(),
      companyPhones: model.getCompanyPhones(),
      identificationType: model.getCompanyIdentificationType()
    };
  }
}