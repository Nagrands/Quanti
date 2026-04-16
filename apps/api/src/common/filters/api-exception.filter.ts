import {
  ConflictException,
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

interface PrismaLikeKnownRequestError {
  code: string;
  clientVersion: string;
  meta?: {
    target?: string[] | string;
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

    if (this.isPrismaKnownRequestError(exception)) {
      this.handlePrismaException(exception, response);
      return;
    }

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

  private isPrismaKnownRequestError(exception: unknown): exception is PrismaLikeKnownRequestError {
    if (!exception || typeof exception !== "object") {
      return false;
    }

    const candidate = exception as Partial<PrismaLikeKnownRequestError>;

    return typeof candidate.code === "string" && typeof candidate.clientVersion === "string";
  }

  private handlePrismaException(
    exception: PrismaLikeKnownRequestError,
    response: {
      status: (statusCode: number) => {
        json: (body: ApiErrorResponse) => void;
      };
    }
  ) {
    if (exception.code === "P2002") {
      const target = Array.isArray(exception.meta?.target)
        ? exception.meta.target.join(", ")
        : exception.meta?.target;
      const conflict = new ConflictException(
        target
          ? `Unique constraint violation for ${target}.`
          : "Unique constraint violation."
      );

      response.status(conflict.getStatus()).json({
        error: {
          code: "CONFLICT",
          message: conflict.message,
          statusCode: conflict.getStatus()
        }
      });

      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Unexpected server error.",
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      }
    });
  }
}
