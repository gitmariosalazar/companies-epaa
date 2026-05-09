export const validateFields = (body: any, requiredFields: string[]): string[] => {
  let missingFieldsMessages: string[] = [];
  for (const field of requiredFields) {
    const value = body[field];
    if (
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      missingFieldsMessages.push(
        `The "${field}" field is required but is missing in the request body.`,
      );
    }
  }
  return missingFieldsMessages;
};
