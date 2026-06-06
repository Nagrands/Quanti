import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { ApiExceptionFilter } from "./common/filters/api-exception.filter";
import { ApiValidationPipe } from "./common/pipes/api-validation.pipe";

const DEFAULT_PORT = 3100;
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

  app.enableCors({
    origin: [...DEFAULT_DESKTOP_ORIGINS]
  });
  app.useGlobalPipes(new ApiValidationPipe());
  app.useGlobalFilters(new ApiExceptionFilter());

  return app;
}

export async function startApiServer(port = DEFAULT_PORT) {
  const app = await createApiApplication();
  await app.listen(port);

  return app;
}

export async function bootstrapApiServer() {
  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  await startApiServer(port);
  Logger.log(`Quanti API is running on port ${port}.`, "Bootstrap");
}
