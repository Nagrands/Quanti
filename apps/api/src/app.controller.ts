import { Controller, Get } from "@nestjs/common";

const DOMAIN_MODULE_NAMES = [
  "products",
  "documents",
  "stock",
  "payments",
  "reports"
] as const;

export interface ApiHealthSnapshot {
  service: "quanti-api";
  status: "ok";
  modules: readonly string[];
}

@Controller()
export class AppController {
  @Get("health")
  getHealth(): ApiHealthSnapshot {
    return {
      service: "quanti-api",
      status: "ok",
      modules: DOMAIN_MODULE_NAMES
    };
  }
}
