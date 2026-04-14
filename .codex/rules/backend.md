# Backend Rules

Backend structure:
- Backend code belongs in `apps/api`.
- Use NestJS modules to organize ERP domains.
- The baseline domain modules are `products`, `documents`, `stock`, `payments`, and `reports`.

Layering rules:
- Controllers must be thin.
- DTO validation belongs at the API boundary and should use stable shared contracts or validation classes.
- Service layer owns orchestration, posting flows, locking, transactions, and consistency checks.
- Repositories or Prisma access helpers may shape persistence calls, but business rules stay in services.

Prisma usage rules:
- Do not call Prisma directly from controllers.
- Keep transaction boundaries explicit around critical operations.
- Return structured, stable errors that the frontend can consume without string parsing.

API rules:
- Favor explicit REST endpoints with predictable payloads.
- Keep read models and write models clear when workflows differ.
- Do not leak database-only structures directly to the frontend if they are not part of the public contract.
