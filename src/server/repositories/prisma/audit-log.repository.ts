import {
  AuditAction,
  EntityType,
  Prisma,
  PrismaClient,
  RoleCode,
} from "@prisma/client";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

function toJsonValue(
  value: Record<string, unknown> | null | undefined,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}

export class PrismaAuditLogRepository {
  constructor(private readonly db: PrismaExecutor) {}

  async create(input: {
    actorUserId: string;
    actorRole: "ADMIN" | "COLLABORATOR" | "APPROVER";
    action:
      | "REGISTER_EXPENSE"
      | "UPDATE_EXPENSE"
      | "DELETE_EXPENSE"
      | "ASSIGN_QUOTA";
    entityType: "EXPENSE" | "MONTHLY_QUOTA";
    entityId: string;
    reason?: string;
    beforeValue?: Record<string, unknown> | null;
    afterValue: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.db.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        actorRole: input.actorRole as RoleCode,
        action: input.action as AuditAction,
        entityType: input.entityType as EntityType,
        entityId: input.entityId,
        reason: input.reason,
        beforeValue: toJsonValue(input.beforeValue),
        afterValue: toJsonValue(input.afterValue) as Prisma.InputJsonValue,
        metadata: toJsonValue(input.metadata),
      },
    });
  }
}
