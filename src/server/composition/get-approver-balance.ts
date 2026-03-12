import { db } from "../../lib/db";
import { createPrismaRepositorySet } from "./common";

export function createGetApproverBalanceDependencies() {
  const repositories = createPrismaRepositorySet(db);

  return {
    collaboratorRepository: repositories.collaboratorRepository,
    monthlyBalanceRepository: repositories.monthlyBalanceRepository,
  };
}
