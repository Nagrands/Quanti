import "reflect-metadata";

import { bootstrapApiServer } from "./bootstrap";

if (process.env.NODE_ENV !== "test") {
  void bootstrapApiServer().catch((error) => {
    console.error("Quanti API failed to start.", error);
    process.exitCode = 1;
  });
}
