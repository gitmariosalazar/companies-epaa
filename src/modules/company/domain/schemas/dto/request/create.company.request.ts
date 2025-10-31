export class CreateCompanyRequest {
  companyName: string;
  socialReason: string;
  companyRuc: string;
  companyAddress: string;
  companyParishId: string;
  companyCountry: string;
  companyEmails: string[];
  companyPhones: string[];
  identificationType: string;

  constructor(
    companyName: string,
    socialReason: string,
    companyRuc: string,
    companyAddress: string,
    companyParishId: string,
    companyCountry: string,
    companyEmails: string[],
    companyPhones: string[],
    identificationType: string
  ) {
    this.companyName = companyName;
    this.socialReason = socialReason;
    this.companyRuc = companyRuc;
    this.companyAddress = companyAddress;
    this.companyParishId = companyParishId;
    this.companyCountry = companyCountry;
    this.companyEmails = companyEmails;
    this.companyPhones = companyPhones;
    this.identificationType = identificationType;
  }
}