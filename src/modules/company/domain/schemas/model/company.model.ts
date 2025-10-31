export class CompanyModel {
  private companyId: number;
  private companyName: string;
  private socialReason: string;
  private companyRuc: string;
  private companyAddress: string;
  private companyParishId: string;
  private companyCountry: string;
  private companyEmails: string[];
  private companyPhones: string[];
  private identificationType: string;

  constructor(
    companyId: number,
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
    this.companyId = companyId;
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

  // Getters
  getCompanyId(): number {
    return this.companyId;
  }

  getCompanyName(): string {
    return this.companyName;
  }

  getCompanySocialReason(): string {
    return this.socialReason;
  }

  getCompanyRuc(): string {
    return this.companyRuc;
  }

  getCompanyAddress(): string {
    return this.companyAddress;
  }

  getCompanyParishId(): string {
    return this.companyParishId;
  }

  getCompanyCountry(): string {
    return this.companyCountry;
  }

  getCompanyEmails(): string[] {
    return this.companyEmails;
  }

  getCompanyPhones(): string[] {
    return this.companyPhones;
  }

  getCompanyIdentificationType(): string {
    return this.identificationType;
  }

  // Setters
  setCompanyName(name: string): void {
    this.companyName = name;
  }

  setCompanySocialReason(socialReason: string): void {
    this.socialReason = socialReason;
  }

  setCompanyRuc(ruc: string): void {
    this.companyRuc = ruc;
  }

  setCompanyAddress(address: string): void {
    this.companyAddress = address;
  }

  setCompanyParishId(parishId: string): void {
    this.companyParishId = parishId;
  }

  setCompanyCountry(country: string): void {
    this.companyCountry = country;
  }

  setCompanyEmails(emails: string[]): void {
    this.companyEmails = emails;
  }

  setCompanyPhones(phones: string[]): void {
    this.companyPhones = phones;
  }

  setCompanyIdentificationType(identificationType: string): void {
    this.identificationType = identificationType;
  }

  // Additional methods can be added as needed
  toJSON(): object {
    return {
      companyId: this.companyId,
      companyName: this.companyName,
      socialReason: this.socialReason,
      companyRuc: this.companyRuc,
      companyAddress: this.companyAddress,
      companyParishId: this.companyParishId,
      companyCountry: this.companyCountry,
      companyEmails: this.companyEmails,
      companyPhones: this.companyPhones,
      IdentificationType: this.identificationType,
    };
  }
}