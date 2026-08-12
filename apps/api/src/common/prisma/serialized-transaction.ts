import type { Prisma } from "@quanti/db";

import type { PrismaService } from "./prisma.service";

const writeQueues = new WeakMap<object, Promise<void>>();

export function serializedTransaction<T>(
  prisma: PrismaService,
  operation: (client: Prisma.TransactionClient) => Promise<T>,
  options?: { maxWait?: number; timeout?: number; isolationLevel?: Prisma.TransactionIsolationLevel }
): Promise<T> {
  const previous = writeQueues.get(prisma) ?? Promise.resolve();
  const result = previous.then(
    () => prisma.$transaction(operation, options),
    () => prisma.$transaction(operation, options)
  );
  writeQueues.set(prisma, result.then(() => undefined, () => undefined));
  return result;
}
