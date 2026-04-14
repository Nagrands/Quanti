import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from "@nestjs/common";

interface ApiErrorResponse {
  error: {
    code: string;
    message: string | string[];
    statusCode: number;
  };
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<{
      status: (statusCode: number) => {
        json: (body: ApiErrorResponse) => void;
      };
    }>();

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const normalizedMessage = typeof exceptionResponse === "string"
        ? exceptionResponse
        : (exceptionResponse as { message?: string | string[] }).message ?? exception.message;

      response.status(statusCode).json({
        error: {
          code: this.getCode(statusCode),
          message: normalizedMessage,
          statusCode
        }
      } satisfies ApiErrorResponse);

      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Unexpected server error.",
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      }
    } satisfies ApiErrorResponse);
  }

  private getCode(statusCode: number) {
    if (statusCode === HttpStatus.BAD_REQUEST) {
      return "VALIDATION_ERROR";
    }

    if (statusCode === HttpStatus.NOT_FOUND) {
      return "NOT_FOUND";
    }

    return "REQUEST_ERROR";
  }
}
