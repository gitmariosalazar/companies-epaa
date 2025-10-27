
export const statusCode = {
  BAD_REQUEST: 400, // request is not valid
  UNAUTHORIZED: 401, // No authenticated
  FORBIDDEN: 403, // No authorized
  NOT_FOUND: 404, // Resource not found
  METHOD_NOT_ALLOWED: 405, // Method HTTP no permitted
  CONFLICT: 409, // Conflict (ej. duplicate in BD)
  UNPROCESSABLE_ENTITY: 422, // Entity no processable
  INTERNAL_SERVER_ERROR: 500, // Internal server error
  NOT_IMPLEMENTED: 501, // Features no implemented
  BAD_GATEWAY: 502, // Error gateway o proxy
  SERVICE_UNAVAILABLE: 503, // Server no available
  GATEWAY_TIMEOUT: 504, // Time out
};