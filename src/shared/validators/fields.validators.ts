export const validateFields = (body: any, requiredFields: string[]): string[] => {
  let missingFieldsMessages: string[] = [];
  for (const field of requiredFields) {
    console.log(body[field])
    const value = body[field];
    if (
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      console.log(`The "${field}" field is required but is missing in the request body.`)
      missingFieldsMessages.push(
        `The "${field}" field is required but is missing in the request body.`,
      );
    }
  }
  return missingFieldsMessages;
};
