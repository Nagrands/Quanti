export function createApiApp(): string {
  return "quanti-api";
}

if (process.env.NODE_ENV !== "test") {
  console.log(createApiApp());
}
