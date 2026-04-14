import "reflect-metadata";

import { bootstrapApiServer } from "./bootstrap";

if (process.env.NODE_ENV !== "test") {
  void bootstrapApiServer();
}
