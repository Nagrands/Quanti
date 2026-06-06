export interface ApiHealthSnapshot {
  service: "quanti-api";
  status: "ok";
  modules: readonly string[];
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string | string[];
    statusCode: number;
  };
}
