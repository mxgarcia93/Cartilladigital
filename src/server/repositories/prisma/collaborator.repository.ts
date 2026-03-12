import { CollaboratorStatus, PrismaClient, type Prisma } from "@prisma/client";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

function mapCollaboratorStatus(status: string): "ACTIVE" | "INACTIVE" {
  return status === "ACTIVE" ? "ACTIVE" : "INACTIVE";
}

export class PrismaCollaboratorRepository {
  constructor(private readonly db: PrismaExecutor) {}

  async create(input: {
    employeeId: string;
    fullName: string;
    documentNumber?: string | null;
    costCenter?: string | null;
    department?: string | null;
    vehicleReference?: string | null;
    userId?: string | null;
    status?: "ACTIVE" | "INACTIVE";
  }): Promise<{
    id: string;
    employeeId: string;
    fullName: string;
    status: "ACTIVE" | "INACTIVE";
    costCenter: string | null;
    department: string | null;
    vehicleReference: string | null;
    documentNumber: string | null;
  }> {
    const collaborator = await this.db.collaborator.create({
      data: {
        employeeId: input.employeeId,
        fullName: input.fullName,
        documentNumber: input.documentNumber,
        costCenter: input.costCenter,
        department: input.department,
        vehicleReference: input.vehicleReference,
        userId: input.userId,
        status:
          input.status === "INACTIVE"
            ? CollaboratorStatus.INACTIVE
            : CollaboratorStatus.ACTIVE,
      },
      select: {
        id: true,
        employeeId: true,
        fullName: true,
        status: true,
        costCenter: true,
        department: true,
        vehicleReference: true,
        documentNumber: true,
      },
    });

    return {
      id: collaborator.id,
      employeeId: collaborator.employeeId,
      fullName: collaborator.fullName,
      status: mapCollaboratorStatus(collaborator.status),
      costCenter: collaborator.costCenter,
      department: collaborator.department,
      vehicleReference: collaborator.vehicleReference,
      documentNumber: collaborator.documentNumber,
    };
  }

  async list(input: {
    search?: string;
    status?: "ACTIVE" | "INACTIVE";
    page: number;
    pageSize: number;
  }): Promise<{
    items: Array<{
      id: string;
      employeeId: string;
      fullName: string;
      status: "ACTIVE" | "INACTIVE";
      costCenter: string | null;
      department: string | null;
      vehicleReference: string | null;
    }>;
    total: number;
  }> {
    const trimmedSearch = input.search?.trim();
    const where = {
      ...(input.status ? { status: input.status } : {}),
      ...(trimmedSearch
        ? {
            OR: [
              {
                employeeId: {
                  contains: trimmedSearch,
                  mode: "insensitive" as const,
                },
              },
              {
                fullName: {
                  contains: trimmedSearch,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.db.collaborator.findMany({
        where,
        orderBy: [{ fullName: "asc" }, { employeeId: "asc" }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        select: {
          id: true,
          employeeId: true,
          fullName: true,
          status: true,
          costCenter: true,
          department: true,
          vehicleReference: true,
        },
      }),
      this.db.collaborator.count({ where }),
    ]);

    return {
      items: items.map((collaborator) => ({
        id: collaborator.id,
        employeeId: collaborator.employeeId,
        fullName: collaborator.fullName,
        status: mapCollaboratorStatus(collaborator.status),
        costCenter: collaborator.costCenter,
        department: collaborator.department,
        vehicleReference: collaborator.vehicleReference,
      })),
      total,
    };
  }

  async findBasicByEmployeeId(employeeId: string): Promise<{
    id: string;
    employeeId: string;
    fullName: string;
    status: "ACTIVE" | "INACTIVE";
  } | null> {
    const collaborator = await this.db.collaborator.findUnique({
      where: { employeeId },
      select: {
        id: true,
        employeeId: true,
        fullName: true,
        status: true,
      },
    });

    if (!collaborator) {
      return null;
    }

    return {
      id: collaborator.id,
      employeeId: collaborator.employeeId,
      fullName: collaborator.fullName,
      status: mapCollaboratorStatus(collaborator.status),
    };
  }

  async findBasicById(id: string): Promise<{
    id: string;
    employeeId: string;
    fullName: string;
    status: "ACTIVE" | "INACTIVE";
  } | null> {
    const collaborator = await this.db.collaborator.findUnique({
      where: { id },
      select: {
        id: true,
        employeeId: true,
        fullName: true,
        status: true,
      },
    });

    if (!collaborator) {
      return null;
    }

    return {
      id: collaborator.id,
      employeeId: collaborator.employeeId,
      fullName: collaborator.fullName,
      status: mapCollaboratorStatus(collaborator.status),
    };
  }

  async findById(id: string): Promise<{
    id: string;
    status: "ACTIVE" | "INACTIVE";
  } | null> {
    const collaborator = await this.db.collaborator.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
      },
    });

    if (!collaborator) {
      return null;
    }

    // Domain use cases only need a minimal collaborator view here.
    return {
      id: collaborator.id,
      status: mapCollaboratorStatus(collaborator.status),
    };
  }

  async findAccessById(id: string): Promise<{
    id: string;
    employeeId: string;
    fullName: string;
    status: "ACTIVE" | "INACTIVE";
    linkedUser: {
      id: string;
      email: string;
      role: "ADMIN" | "APPROVER" | "COLLABORATOR";
      status: "ACTIVE" | "INACTIVE" | "LOCKED";
    } | null;
  } | null> {
    const collaborator = await this.db.collaborator.findUnique({
      where: { id },
      select: {
        id: true,
        employeeId: true,
        fullName: true,
        status: true,
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
          },
        },
      },
    });

    if (!collaborator) {
      return null;
    }

    return {
      id: collaborator.id,
      employeeId: collaborator.employeeId,
      fullName: collaborator.fullName,
      status: mapCollaboratorStatus(collaborator.status),
      linkedUser: collaborator.user
        ? {
            id: collaborator.user.id,
            email: collaborator.user.email,
            role: collaborator.user.role,
            status: collaborator.user.status,
          }
        : null,
    };
  }
}
