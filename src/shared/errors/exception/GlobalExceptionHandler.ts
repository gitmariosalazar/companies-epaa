import {
  Catch,
  RpcExceptionFilter,
  ArgumentsHost,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { RpcException } from '@nestjs/microservices';
import { statusCode } from '../../../settings/environments/status-code';

@Catch()
export class RpcCustomExceptionFilterMicoserviceSecurity
  implements RpcExceptionFilter {
  private readonly logger = new Logger(
    RpcCustomExceptionFilterMicoserviceSecurity.name,
  );

  catch(exception: any, host: ArgumentsHost): Observable<any> {
    const ctx = host.switchToRpc();
    const response = ctx.getContext();
    const requestUrl = response.req?.url || 'unknown';

    let statusCodeValue = statusCode.INTERNAL_SERVER_ERROR;
    let message: string | string[] = ['An unexpected error occurred'];

    if (exception instanceof RpcException) {
      const errorResponse = exception.getError();
      this.logger.error(
        `RpcException caught: ${JSON.stringify(errorResponse)}`,
      );

      if (errorResponse instanceof AggregateError) {
        const errorDetails = errorResponse.errors || [];
        const connectionErrors = errorDetails.filter(
          (err: any) => err.code === 'ECONNREFUSED',
        );

        if (connectionErrors.length > 0) {
          this.logger.error('Connection refused error detected:');
          connectionErrors.forEach((err: any) => {
            this.logger.error(
              `Failed to connect to ${err.address}:${err.port}`,
            );
          });
          statusCodeValue = statusCode.SERVICE_UNAVAILABLE; // 503
          message = [
            'Connection refused by target service. Please check the service availability.',
          ];
        } else {
          statusCodeValue = statusCode.INTERNAL_SERVER_ERROR;
          message = errorDetails.map(
            (err: any) => err.message || 'Unknown error',
          );
        }
      } else if (typeof errorResponse === 'object' && errorResponse !== null) {
        // Set structure { error: { statusCode, message } } o { statusCode, message }
        let errorObject = errorResponse;
        if (
          'error' in errorResponse &&
          typeof errorResponse.error === 'object' &&
          errorResponse.error !== null
        ) {
          errorObject = errorResponse.error;
        }
        const { statusCode: code, message: errorMessage } = errorObject as {
          statusCode?: number;
          message?: string | string[];
        };

        this.logger.error(
          `Error object caught: ${JSON.stringify(errorObject)}`,
        );

        statusCodeValue = code || statusCode.INTERNAL_SERVER_ERROR;
        message = errorMessage || ['An unknown error occurred'];
      } else if (typeof errorResponse === 'string') {
        message = [errorResponse];
        statusCodeValue = statusCode.INTERNAL_SERVER_ERROR;
      }
    } else {
      this.logger.error(
        `Unexpected error caught: ${exception.message} at ${exception.code}`,
        exception.stack,
      );
      statusCodeValue = statusCode.INTERNAL_SERVER_ERROR;
      message = [exception.message || 'An unexpected error occurred'];
    }

    // Standardize all errors as RpcException
    const rpcException = new RpcException({
      statusCode: statusCodeValue,
      message: Array.isArray(message) ? message : [message],
    });

    // Structure the error response
    const errorResponse = {
      time: new Date().toISOString(),
      message: Array.isArray(message) ? message : [message],
      url: requestUrl,
      data: null,
      status_code: statusCodeValue,
    };

    this.logger.log(
      `Error response sent: ${JSON.stringify(errorResponse)} at ${message}`,
    );
    return throwError(() => rpcException);
  }
}
