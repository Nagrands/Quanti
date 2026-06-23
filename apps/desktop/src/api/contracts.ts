export interface ApiHealthSnapshot {
  service: "quanti-api";
  status: "ok";
  database: "ok";
  modules: readonly string[];
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string | string[];
    statusCode: number;
    details?: Record<string, unknown>;
  };
}
