import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import {
  AuditAction,
  CollaboratorStatus,
  EntityType,
  ExpenseCategory,
  ExpenseStatus,
  Prisma,
  PrismaClient,
  QuotaStatus,
  RoleCode,
  UserStatus,
} from "@prisma/client";

export type SeedResult = {
  year: number;
  month: number;
  users: number;
  collaborators: number;
  quotas: number;
  expenses: number;
  balances: number;
  auditLogs: number;
  approverEmail: string;
};

export async function runSeed(): Promise<SeedResult> {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    const [adminPasswordHash, approverPasswordHash, collaboratorPasswordHash] =
      await Promise.all([
        bcrypt.hash("admin123", 10),
        bcrypt.hash("aprobador123", 10),
        bcrypt.hash("colaborador123", 10),
      ]);

    await prisma.auditLog.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.monthlyBalance.deleteMany();
    await prisma.monthlyQuota.deleteMany();
    await prisma.collaborator.deleteMany();
    await prisma.user.deleteMany();

    const adminUser = await prisma.user.create({
      data: {
        email: "admin@cartilla.local",
        fullName: "Administrador General",
        role: RoleCode.ADMIN,
        status: UserStatus.ACTIVE,
        passwordHash: adminPasswordHash,
      },
    });

    const approverUser = await prisma.user.create({
      data: {
        email: "aprobador@cartilla.local",
        fullName: "Aprobador Operativo",
        role: RoleCode.APPROVER,
        status: UserStatus.ACTIVE,
        passwordHash: approverPasswordHash,
      },
    });

    const collaboratorUser = await prisma.user.create({
      data: {
        email: "colaborador@cartilla.local",
        fullName: "Carlos Mendoza",
        role: RoleCode.COLLABORATOR,
        status: UserStatus.ACTIVE,
        passwordHash: collaboratorPasswordHash,
      },
    });

    const collaboratorOne = await prisma.collaborator.create({
      data: {
        employeeId: "EMP-1001",
        documentNumber: "0912345678",
        fullName: "Carlos Mendoza",
        costCenter: "OPERACIONES",
        department: "Logistica",
        vehicleReference: "CAMION-12",
        userId: collaboratorUser.id,
        status: CollaboratorStatus.ACTIVE,
      },
    });

    const collaboratorTwo = await prisma.collaborator.create({
      data: {
        employeeId: "EMP-1002",
        documentNumber: "0923456789",
        fullName: "Ana Torres",
        costCenter: "MANTENIMIENTO",
        department: "Flota",
        vehicleReference: "UTILITARIO-07",
        status: CollaboratorStatus.ACTIVE,
      },
    });

    const quotaOneAmount = new Prisma.Decimal("300.00");
    const quotaTwoAmount = new Prisma.Decimal("250.00");

    const quotaOne = await prisma.monthlyQuota.create({
      data: {
        collaboratorId: collaboratorOne.id,
        year,
        month,
        amount: quotaOneAmount,
        currency: "USD",
        assignedByUserId: adminUser.id,
        status: QuotaStatus.ACTIVE,
      },
    });

    const quotaTwo = await prisma.monthlyQuota.create({
      data: {
        collaboratorId: collaboratorTwo.id,
        year,
        month,
        amount: quotaTwoAmount,
        currency: "USD",
        assignedByUserId: adminUser.id,
        status: QuotaStatus.ACTIVE,
      },
    });

    const expenseOne = await prisma.expense.create({
      data: {
        collaboratorId: collaboratorOne.id,
        expenseDate: new Date(Date.UTC(year, month - 1, 5, 14, 0, 0)),
        year,
        month,
        category: ExpenseCategory.FUEL,
        amount: new Prisma.Decimal("80.00"),
        currency: "USD",
        description: "Carga de combustible semanal",
        registeredByUserId: collaboratorUser.id,
        status: ExpenseStatus.ACTIVE,
      },
    });

    const expenseTwo = await prisma.expense.create({
      data: {
        collaboratorId: collaboratorOne.id,
        expenseDate: new Date(Date.UTC(year, month - 1, 12, 10, 30, 0)),
        year,
        month,
        category: ExpenseCategory.MAINTENANCE,
        amount: new Prisma.Decimal("45.00"),
        currency: "USD",
        description: "Cambio de aceite",
        registeredByUserId: adminUser.id,
        status: ExpenseStatus.ACTIVE,
      },
    });

    const expenseThree = await prisma.expense.create({
      data: {
        collaboratorId: collaboratorTwo.id,
        expenseDate: new Date(Date.UTC(year, month - 1, 8, 9, 15, 0)),
        year,
        month,
        category: ExpenseCategory.FUEL,
        amount: new Prisma.Decimal("60.00"),
        currency: "USD",
        description: "Recarga de combustible de ruta",
        registeredByUserId: adminUser.id,
        status: ExpenseStatus.ACTIVE,
      },
    });

    const expenseFour = await prisma.expense.create({
      data: {
        collaboratorId: collaboratorTwo.id,
        expenseDate: new Date(Date.UTC(year, month - 1, 18, 16, 45, 0)),
        year,
        month,
        category: ExpenseCategory.MAINTENANCE,
        amount: new Prisma.Decimal("30.00"),
        currency: "USD",
        description: "Revision preventiva de frenos",
        registeredByUserId: adminUser.id,
        status: ExpenseStatus.ACTIVE,
      },
    });

    const collaboratorOneExecuted = new Prisma.Decimal("125.00");
    const collaboratorTwoExecuted = new Prisma.Decimal("90.00");

    await prisma.monthlyBalance.create({
      data: {
        collaboratorId: collaboratorOne.id,
        year,
        month,
        openingBalance: quotaOneAmount,
        quotaAmount: quotaOneAmount,
        executedAmount: collaboratorOneExecuted,
        closingBalance: new Prisma.Decimal("175.00"),
        currency: "USD",
        lastExpenseDate: expenseTwo.expenseDate,
        calculationVersion: 1,
        recalculatedAt: now,
      },
    });

    await prisma.monthlyBalance.create({
      data: {
        collaboratorId: collaboratorTwo.id,
        year,
        month,
        openingBalance: quotaTwoAmount,
        quotaAmount: quotaTwoAmount,
        executedAmount: collaboratorTwoExecuted,
        closingBalance: new Prisma.Decimal("160.00"),
        currency: "USD",
        lastExpenseDate: expenseFour.expenseDate,
        calculationVersion: 1,
        recalculatedAt: now,
      },
    });

    await prisma.auditLog.createMany({
      data: [
        {
          actorUserId: adminUser.id,
          actorRole: RoleCode.ADMIN,
          action: AuditAction.ASSIGN_QUOTA,
          entityType: EntityType.MONTHLY_QUOTA,
          entityId: quotaOne.id,
          reason: "Asignacion inicial de cupo mensual",
          beforeValue: Prisma.JsonNull,
          afterValue: {
            collaboratorId: collaboratorOne.id,
            year,
            month,
            amount: "300.00",
            currency: "USD",
          },
          metadata: {
            employeeId: collaboratorOne.employeeId,
          },
        },
        {
          actorUserId: adminUser.id,
          actorRole: RoleCode.ADMIN,
          action: AuditAction.ASSIGN_QUOTA,
          entityType: EntityType.MONTHLY_QUOTA,
          entityId: quotaTwo.id,
          reason: "Asignacion inicial de cupo mensual",
          beforeValue: Prisma.JsonNull,
          afterValue: {
            collaboratorId: collaboratorTwo.id,
            year,
            month,
            amount: "250.00",
            currency: "USD",
          },
          metadata: {
            employeeId: collaboratorTwo.employeeId,
          },
        },
        {
          actorUserId: collaboratorUser.id,
          actorRole: RoleCode.COLLABORATOR,
          action: AuditAction.REGISTER_EXPENSE,
          entityType: EntityType.EXPENSE,
          entityId: expenseOne.id,
          reason: "Registro de gasto de combustible",
          beforeValue: Prisma.JsonNull,
          afterValue: {
            collaboratorId: collaboratorOne.id,
            category: ExpenseCategory.FUEL,
            amount: "80.00",
            currency: "USD",
          },
          metadata: {
            employeeId: collaboratorOne.employeeId,
          },
        },
        {
          actorUserId: adminUser.id,
          actorRole: RoleCode.ADMIN,
          action: AuditAction.REGISTER_EXPENSE,
          entityType: EntityType.EXPENSE,
          entityId: expenseThree.id,
          reason: "Registro de gasto operativo",
          beforeValue: Prisma.JsonNull,
          afterValue: {
            collaboratorId: collaboratorTwo.id,
            category: ExpenseCategory.FUEL,
            amount: "60.00",
            currency: "USD",
          },
          metadata: {
            employeeId: collaboratorTwo.employeeId,
          },
        },
      ],
    });

    return {
      year,
      month,
      users: 3,
      collaborators: 2,
      quotas: 2,
      expenses: 4,
      balances: 2,
      auditLogs: 4,
      approverEmail: approverUser.email,
    };
  } finally {
    await prisma.$disconnect();
  }
}
