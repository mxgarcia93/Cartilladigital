import {
  recalculateBalances,
  type RecalculateBalancesDependencies,
  type RecalculateBalancesOutput,
} from "./recalculate-balances";

export class AssignMonthlyQuotaBusinessError extends Error {
  constructor(
    message: string,
    readonly code:
      | "COLLABORATOR_NOT_FOUND"
      | "COLLABORATOR_INACTIVE"
      | "INVALID_QUOTA_AMOUNT"
      | "INVALID_PERIOD",
  ) {
    super(message);
    this.name = "AssignMonthlyQuotaBusinessError";
  }
}

export type CollaboratorRecord = {
  id: string;
  status: "ACTIVE" | "INACTIVE";
};

export type MonthlyQuotaRecord = {
  id: string;
  collaboratorId: string;
  year: number;
  month: number;
  amount: number;
  currency: string;
  assignedByUserId: string;
  updatedByUserId: string | null;
  status: "ACTIVE" | "ADJUSTED" | "CANCELLED";
  createdAt: Date;
  updatedAt: Date;
};

export type UpsertMonthlyQuotaInput = {
  collaboratorId: string;
  year: number;
  month: number;
  amount: number;
  currency: string;
  assignedByUserId: string;
  updatedByUserId?: string;
};

export type CreateAuditLogInput = {
  actorUserId: string;
  actorRole: "ADMIN";
  action: "ASSIGN_QUOTA";
  entityType: "MONTHLY_QUOTA";
  entityId: string;
  reason?: string;
  beforeValue: Record<string, unknown> | null;
  afterValue: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type AssignMonthlyQuotaInput = {
  collaboratorId: string;
  year: number;
  month: number;
  amount: number;
  currency?: string;
  actorUserId: string;
  actorRole: "ADMIN";
};

export type AssignMonthlyQuotaOutput = {
  quota: MonthlyQuotaRecord;
  recalculation: RecalculateBalancesOutput;
};

export interface CollaboratorRepository {
  findById(id: string): Promise<CollaboratorRecord | null>;
}

export interface MonthlyQuotaRepository {
  findByCollaboratorAndPeriod(input: {
    collaboratorId: string;
    year: number;
    month: number;
  }): Promise<MonthlyQuotaRecord | null>;
  upsertForPeriod(input: UpsertMonthlyQuotaInput): Promise<MonthlyQuotaRecord>;
}

export interface AuditLogRepository {
  create(input: CreateAuditLogInput): Promise<void>;
}

export type AssignMonthlyQuotaRepositories = {
  collaboratorRepository: CollaboratorRepository;
  monthlyQuotaRepository: MonthlyQuotaRepository;
  auditLogRepository: AuditLogRepository;
};

export interface AssignMonthlyQuotaTransactionRunner {
  runInTransaction<T>(
    operation: (
      repositories: AssignMonthlyQuotaRepositories &
        RecalculateBalancesDependencies["repositories"],
    ) => Promise<T>,
  ): Promise<T>;
}

export type AssignMonthlyQuotaDependencies = {
  repositories: AssignMonthlyQuotaRepositories &
    RecalculateBalancesDependencies["repositories"];
  transactionRunner?: AssignMonthlyQuotaTransactionRunner;
};

function validateQuotaAmount(amount: number): void {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new AssignMonthlyQuotaBusinessError(
      "Quota amount must be greater than or equal to zero.",
      "INVALID_QUOTA_AMOUNT",
    );
  }
}

function validatePeriod(year: number, month: number): void {
  if (!Number.isInteger(year) || year < 2000 || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new AssignMonthlyQuotaBusinessError(
      "Year and month must define a valid period.",
      "INVALID_PERIOD",
    );
  }
}

function mapQuotaSnapshot(quota: MonthlyQuotaRecord): Record<string, unknown> {
  return {
    collaboratorId: quota.collaboratorId,
    year: quota.year,
    month: quota.month,
    amount: quota.amount,
    currency: quota.currency,
    status: quota.status,
    assignedByUserId: quota.assignedByUserId,
    updatedByUserId: quota.updatedByUserId,
  };
}

async function executeAssignMonthlyQuota(
  repositories: AssignMonthlyQuotaDependencies["repositories"],
  input: AssignMonthlyQuotaInput,
): Promise<AssignMonthlyQuotaOutput> {
  validateQuotaAmount(input.amount);
  validatePeriod(input.year, input.month);

  // Business flow step 1:
  // a quota can only be assigned to an existing collaborator.
  const collaborator = await repositories.collaboratorRepository.findById(
    input.collaboratorId,
  );

  if (!collaborator) {
    throw new AssignMonthlyQuotaBusinessError(
      "Collaborator does not exist.",
      "COLLABORATOR_NOT_FOUND",
    );
  }

  // Business flow step 2:
  // only active collaborators can receive or keep an operational monthly quota.
  if (collaborator.status !== "ACTIVE") {
    throw new AssignMonthlyQuotaBusinessError(
      "Collaborator is not active.",
      "COLLABORATOR_INACTIVE",
    );
  }

  // Business flow step 3:
  // if the monthly quota already exists, the use case updates it;
  // otherwise, it creates the quota for the target period.
  const existingQuota =
    await repositories.monthlyQuotaRepository.findByCollaboratorAndPeriod({
      collaboratorId: input.collaboratorId,
      year: input.year,
      month: input.month,
    });

  const quota = await repositories.monthlyQuotaRepository.upsertForPeriod({
    collaboratorId: input.collaboratorId,
    year: input.year,
    month: input.month,
    amount: input.amount,
    currency: input.currency ?? "USD",
    assignedByUserId: existingQuota?.assignedByUserId ?? input.actorUserId,
    updatedByUserId: existingQuota ? input.actorUserId : undefined,
  });

  // Business flow step 4:
  // every quota assignment or update affects the financial chain from that
  // month onward, so balances must be recalculated in chronological order.
  const recalculation = await recalculateBalances(
    {
      repositories,
    },
    {
      collaboratorId: input.collaboratorId,
      year: input.year,
      month: input.month,
    },
  );

  // Business flow step 5:
  // quota creation and quota updates must be auditable.
  await repositories.auditLogRepository.create({
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    action: "ASSIGN_QUOTA",
    entityType: "MONTHLY_QUOTA",
    entityId: quota.id,
    reason: existingQuota
      ? "Monthly quota updated through assignMonthlyQuota use case."
      : "Monthly quota assigned through assignMonthlyQuota use case.",
    beforeValue: existingQuota ? mapQuotaSnapshot(existingQuota) : null,
    afterValue: mapQuotaSnapshot(quota),
    metadata: {
      recalculatedMonths: recalculation.months.map((item) => ({
        year: item.year,
        month: item.month,
        closingBalance: item.closingBalance,
      })),
    },
  });

  return {
    quota,
    recalculation,
  };
}

export async function assignMonthlyQuota(
  dependencies: AssignMonthlyQuotaDependencies,
  input: AssignMonthlyQuotaInput,
): Promise<AssignMonthlyQuotaOutput> {
  if (dependencies.transactionRunner) {
    return dependencies.transactionRunner.runInTransaction((repositories) =>
      executeAssignMonthlyQuota(repositories, input),
    );
  }

  return executeAssignMonthlyQuota(dependencies.repositories, input);
}
