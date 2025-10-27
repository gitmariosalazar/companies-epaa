import { HttpException, HttpStatus } from '@nestjs/common';

export class ResourceNotFoundException extends HttpException {
  resourceName: string;
  fieldName: string;
  fieldValue: any;

  constructor(resourceName: string, fieldName?: string, fieldValue?: any) {
    if (fieldName && fieldValue) {
      super(
        `${resourceName} with ${fieldName} = '${fieldValue}' not found!`,
        HttpStatus.NOT_FOUND,
      );
      this.fieldName = fieldName;
      this.fieldValue = fieldValue;
    } else {
      super(`${resourceName} not found in the system.`, HttpStatus.NOT_FOUND);
    }
    this.resourceName = resourceName;
  }
}
