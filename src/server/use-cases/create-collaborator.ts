import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";

export class CreateCollaboratorBusinessError extends Error {
  constructor(
    message: string,
    readonly code:
      | "EMAIL_REQUIRED_FOR_USER_ACCESS"
      | "DUPLICATE_EMAIL"
      | "INVALID_EMAIL",
  ) {
    super(message);
    this.name = "CreateCollaboratorBusinessError";
  }
}

export type CreateCollaboratorInput = {
  employeeId: string;
  fullName: string;
  documentNumber?: string | null;
  costCenter?: string | null;
  department?: string | null;
  vehicleReference?: string | null;
  status?: "ACTIVE" | "INACTIVE";
  createUserAccess?: boolean;
  email?: string | null;
};

export type CreateCollaboratorOutput = {
  collaborator: {
    id: string;
    employeeId: string;
    fullName: string;
    status: "ACTIVE" | "INACTIVE";
    costCenter: string | null;
    department: string | null;
    vehicleReference: string | null;
    documentNumber: string | null;
  };
  userAccess: {
    userId: string;
    email: string;
    temporaryPassword: string;
  } | null;
};

export interface CollaboratorRepository {
  create(input: {
    employeeId: string;
    fullName: string;
    documentNumber?: string | null;
    costCenter?: string | null;
    department?: string | null;
    vehicleReference?: string | null;
    userId?: string | null;
    status?: "ACTIVE" | "INACTIVE";
  }): Promise<CreateCollaboratorOutput["collaborator"]>;
}

export interface UserRepository {
  findByEmail(email: string): Promise<{
    id: string;
    email: string;
  } | null>;
  createCollaboratorAccess(input: {
    email: string;
    fullName: string;
    passwordHash: string;
    mustChangePassword: boolean;
  }): Promise<{
    id: string;
    email: string;
    role: "COLLABORATOR";
    status: "ACTIVE";
  }>;
}

export type CreateCollaboratorRepositories = {
  collaboratorRepository: CollaboratorRepository;
  userRepository: UserRepository;
};

export interface CreateCollaboratorTransactionRunner {
  runInTransaction<T>(
    operation: (repositories: CreateCollaboratorRepositories) => Promise<T>,
  ): Promise<T>;
}

export type CreateCollaboratorDependencies = {
  repositories: CreateCollaboratorRepositories;
  transactionRunner?: CreateCollaboratorTransactionRunner;
};

function generateTemporaryPassword(): string {
  return randomBytes(9).toString("base64url");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validateAccessEmail(email: string | null | undefined): string {
  const normalizedEmail = normalizeEmail(email ?? "");

  if (!normalizedEmail) {
    throw new CreateCollaboratorBusinessError(
      "Email is required when user access creation is enabled.",
      "EMAIL_REQUIRED_FOR_USER_ACCESS",
    );
  }

  if (!normalizedEmail.includes("@")) {
    throw new CreateCollaboratorBusinessError(
      "Email must be a valid email address.",
      "INVALID_EMAIL",
    );
  }

  return normalizedEmail;
}

async function executeCreateCollaborator(
  repositories: CreateCollaboratorRepositories,
  input: CreateCollaboratorInput,
): Promise<CreateCollaboratorOutput> {
  let userAccess: CreateCollaboratorOutput["userAccess"] = null;
  let userId: string | null = null;

  if (input.createUserAccess) {
    const email = validateAccessEmail(input.email);
    const existingUser = await repositories.userRepository.findByEmail(email);

    if (existingUser) {
      throw new CreateCollaboratorBusinessError(
        "A user with that email already exists.",
        "DUPLICATE_EMAIL",
      );
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    const createdUser = await repositories.userRepository.createCollaboratorAccess(
      {
        email,
        fullName: input.fullName.trim(),
        passwordHash,
        mustChangePassword: true,
      },
    );

    userId = createdUser.id;
    userAccess = {
      userId: createdUser.id,
      email: createdUser.email,
      temporaryPassword,
    };
  }

  const collaborator = await repositories.collaboratorRepository.create({
    employeeId: input.employeeId.trim(),
    fullName: input.fullName.trim(),
    documentNumber: input.documentNumber ?? null,
    costCenter: input.costCenter ?? null,
    department: input.department ?? null,
    vehicleReference: input.vehicleReference ?? null,
    userId,
    status: input.status ?? "ACTIVE",
  });

  return {
    collaborator,
    userAccess,
  };
}

export async function createCollaborator(
  dependencies: CreateCollaboratorDependencies,
  input: CreateCollaboratorInput,
): Promise<CreateCollaboratorOutput> {
  if (dependencies.transactionRunner) {
    return dependencies.transactionRunner.runInTransaction((repositories) =>
      executeCreateCollaborator(repositories, input),
    );
  }

  return executeCreateCollaborator(dependencies.repositories, input);
}
