import { db } from "../../lib/db";
import { createPrismaRepositorySet } from "./common";

export function createListCollaboratorsDependencies() {
  const repositories = createPrismaRepositorySet(db);

  return {
    collaboratorRepository: repositories.collaboratorRepository,
  };
}
