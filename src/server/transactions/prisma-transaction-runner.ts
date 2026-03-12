import { PrismaClient, type Prisma } from "@prisma/client";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export function createPrismaTransactionRunner<TRepositories>(
  prisma: PrismaClient,
  buildRepositories: (db: PrismaExecutor) => TRepositories,
) {
  return {
    // The transaction callback receives a Prisma transaction client.
    // We rebuild the repositories with that client so all repository calls
    // inside the use case share the same database transaction.
    async runInTransaction<T>(
      operation: (repositories: TRepositories) => Promise<T>,
    ): Promise<T> {
      return prisma.$transaction(async (tx) => {
        const repositories = buildRepositories(tx);
        return operation(repositories);
      });
    },
  };
}
