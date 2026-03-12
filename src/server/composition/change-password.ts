import { db } from "../../lib/db";
import { createPrismaTransactionRunner } from "../transactions/prisma-transaction-runner";
import { createPrismaRepositorySet, type PrismaRepositorySet } from "./common";

function selectRepositories(repositories: PrismaRepositorySet) {
  return {
    userRepository: repositories.userRepository,
  };
}

export function createChangePasswordDependencies() {
  const repositories = selectRepositories(createPrismaRepositorySet(db));

  return {
    repositories,
    transactionRunner: createPrismaTransactionRunner(db, (tx) =>
      selectRepositories(createPrismaRepositorySet(tx)),
    ),
  };
}
