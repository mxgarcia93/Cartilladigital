import { db } from "../../lib/db";
import { createPrismaRepositorySet } from "./common";

export function createGetCollaboratorLedgerDependencies() {
  const repositories = createPrismaRepositorySet(db);

  return {
    collaboratorRepository: repositories.collaboratorRepository,
    monthlyQuotaRepository: repositories.monthlyQuotaRepository,
    monthlyBalanceRepository: repositories.monthlyBalanceRepository,
    expenseRepository: repositories.expenseRepository,
  };
}
