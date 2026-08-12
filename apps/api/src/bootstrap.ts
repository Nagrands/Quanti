import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { timingSafeEqual } from "node:crypto";

import { AppModule } from "./app.module";
import { ApiExceptionFilter } from "./common/filters/api-exception.filter";
import { ApiValidationPipe } from "./common/pipes/api-validation.pipe";
import { prepareRuntimeDatabase } from "./common/database/database-lifecycle";

const DEFAULT_PORT = 3100;
const DEFAULT_HOST = "127.0.0.1";
export const DEFAULT_DESKTOP_ORIGINS = [
  "http://localhost:1420",
  "http://127.0.0.1:1420",
  "http://tauri.localhost",
  "https://tauri.localhost",
  "tauri://localhost"
] as const;

export async function createApiApplication() {
  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === "test" ? false : ["error", "warn", "log"]
  });
  app.enableShutdownHooks();

  app.enableCors({
    origin: [...DEFAULT_DESKTOP_ORIGINS]
  });
  const sessionToken = process.env.QUANTI_SESSION_TOKEN?.trim();
  if (sessionToken) {
    const expected = Buffer.from(`Bearer ${sessionToken}`);
    app.use((request: { headers: Record<string, string | string[] | undefined> }, response: {
      status(code: number): { json(body: unknown): void };
    }, next: () => void) => {
      const authorization = request.headers.authorization;
      const actual = Buffer.from(typeof authorization === "string" ? authorization : "");
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
        response.status(401).json({ code: "UNAUTHORIZED", message: "Invalid Quanti runtime token.", statusCode: 401 });
        return;
      }
      next();
    });
  }
  app.useGlobalPipes(new ApiValidationPipe());
  app.useGlobalFilters(new ApiExceptionFilter());

  return app;
}

export async function startApiServer(
  port = DEFAULT_PORT,
  host = process.env.HOST ?? DEFAULT_HOST
) {
  await prepareRuntimeDatabase();
  const app = await createApiApplication();
  await app.listen(port, host);

  return app;
}

export async function bootstrapApiServer() {
  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  const host = process.env.HOST ?? DEFAULT_HOST;
  await startApiServer(port, host);
  Logger.log(`Quanti API is running at http://${host}:${port}.`, "Bootstrap");
}
