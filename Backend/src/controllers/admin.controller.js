import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";

const ALLOWED_CREATE_ROLES = ["MANAGER", "EMPLOYEE"];
const ALLOWED_DESIGNATIONS = ["EMPLOYEE", "FINANCE", "DIRECTOR", "CFO", "MANAGER"];

function normalizeCreatePayload(payload) {
  const normalizedRole = payload.role?.trim()?.toUpperCase() || "EMPLOYEE";
  const normalizedDesignation = payload.designation?.trim()?.toUpperCase();

  return {
    email: payload.email?.trim()?.toLowerCase(),
    password: payload.password,
    firstName: payload.firstName?.trim(),
    lastName: payload.lastName?.trim() || null,
    role: normalizedRole,
    designation:
      normalizedDesignation || (normalizedRole === "MANAGER" ? "MANAGER" : "EMPLOYEE"),
    managerId: payload.managerId || null,
    isManager: payload.isManager,
    isApprover: payload.isApprover,
    department: payload.department?.trim() || null,
  };
}

function validateCreatePayload(payload) {
  if (!payload.email || !payload.password || !payload.firstName) {
    return "email, password, and firstName are required";
  }

  if (payload.password.length < 6) {
    return "Password must be at least 6 characters";
  }

  if (!ALLOWED_CREATE_ROLES.includes(payload.role)) {
    return "Invalid role. Allowed roles: MANAGER, EMPLOYEE";
  }

  if (!ALLOWED_DESIGNATIONS.includes(payload.designation)) {
    return "Invalid designation. Allowed: EMPLOYEE, FINANCE, DIRECTOR, CFO, MANAGER";
  }

  return null;
}

async function getValidatedAdminContext(adminId, jwtCompanyId) {
  const admin = await prisma.employee.findUnique({
    where: { id: adminId },
    select: {
      id: true,
      role: true,
      status: true,
      companyId: true,
    },
  });

  if (!admin) {
    throw new Error("ADMIN_NOT_FOUND");
  }

  if (admin.status !== "ACTIVE") {
    throw new Error("ADMIN_INACTIVE");
  }

  if (admin.role !== "ADMIN") {
    throw new Error("ADMIN_REQUIRED");
  }

  const companyId = admin.companyId || jwtCompanyId;
  if (!companyId) {
    throw new Error("COMPANY_CONTEXT_MISSING");
  }

  return { companyId };
}

async function validateManagerIfPresent(companyId, managerId) {
  if (!managerId) return;

  const manager = await prisma.employee.findFirst({
    where: {
      id: managerId,
      companyId,
      status: "ACTIVE",
      role: { in: ["ADMIN", "MANAGER"] },
    },
    select: { id: true },
  });

  if (!manager) {
    throw new Error("INVALID_MANAGER");
  }
}

function serializeEmployee(employee) {
  return {
    id: employee.id,
    email: employee.email,
    firstName: employee.firstName,
    lastName: employee.lastName,
    role: employee.role,
    designation: employee.designation,
    companyId: employee.companyId,
    managerId: employee.managerId,
    isManager: employee.isManager,
    isApprover: employee.isApprover,
    department: employee.department,
    status: employee.status,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
  };
}

/**
 * POST /api/admin/users
 * ADMIN creates MANAGER/EMPLOYEE in same company
 */
export async function createUserByAdmin(req, res) {
  try {
    const adminId = req.userId;
    const jwtCompanyId = req.companyId;
    const normalizedPayload = normalizeCreatePayload(req.body || {});

    const validationError = validateCreatePayload(normalizedPayload);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
        data: {
          allowedRoles: ALLOWED_CREATE_ROLES,
          allowedDesignations: ALLOWED_DESIGNATIONS,
        },
      });
    }

    const { companyId } = await getValidatedAdminContext(adminId, jwtCompanyId);

    await validateManagerIfPresent(companyId, normalizedPayload.managerId);

    const existingUser = await prisma.employee.findFirst({
      where: {
        email: normalizedPayload.email,
        companyId,
      },
      select: { id: true },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already exists in this company",
      });
    }

    const hashedPassword = await bcrypt.hash(normalizedPayload.password, 10);

    const employee = await prisma.employee.create({
      data: {
        email: normalizedPayload.email,
        password: hashedPassword,
        firstName: normalizedPayload.firstName,
        lastName: normalizedPayload.lastName,
        role: normalizedPayload.role,
        designation: normalizedPayload.designation,
        companyId,
        managerId: normalizedPayload.managerId,
        isManager: normalizedPayload.role === "MANAGER" ? true : Boolean(normalizedPayload.isManager),
        isApprover: normalizedPayload.role === "MANAGER" ? true : Boolean(normalizedPayload.isApprover),
        department: normalizedPayload.department,
        status: "ACTIVE",
      },
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        user: serializeEmployee(employee),
        allowedRoles: ALLOWED_CREATE_ROLES,
        allowedDesignations: ALLOWED_DESIGNATIONS,
      },
    });
  } catch (error) {
    if (error.message === "ADMIN_NOT_FOUND") {
      return res.status(401).json({ success: false, message: "Admin not found" });
    }
    if (error.message === "ADMIN_INACTIVE") {
      return res.status(403).json({ success: false, message: "Inactive admin cannot create users" });
    }
    if (error.message === "ADMIN_REQUIRED") {
      return res.status(403).json({ success: false, message: "Only ADMIN can create users" });
    }
    if (error.message === "COMPANY_CONTEXT_MISSING") {
      return res.status(400).json({ success: false, message: "Company context missing for admin" });
    }
    if (error.message === "INVALID_MANAGER") {
      return res.status(400).json({ success: false, message: "managerId must belong to an active ADMIN or MANAGER in same company" });
    }

    console.error("Create user by admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create user",
      error: error.message,
    });
  }
}

/**
 * GET /api/admin/users
 * ADMIN gets all users in same company
 */
export async function getAllUsersByAdmin(req, res) {
  try {
    const adminId = req.userId;
    const jwtCompanyId = req.companyId;
    const { companyId } = await getValidatedAdminContext(adminId, jwtCompanyId);

    const search = req.query.search?.toString().trim();
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const where = {
      companyId,
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, users] = await prisma.$transaction([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          designation: true,
          companyId: true,
          managerId: true,
          isManager: true,
          isApprover: true,
          department: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    if (error.message === "ADMIN_NOT_FOUND") {
      return res.status(401).json({ success: false, message: "Admin not found" });
    }
    if (error.message === "ADMIN_INACTIVE") {
      return res.status(403).json({ success: false, message: "Inactive admin cannot access users" });
    }
    if (error.message === "ADMIN_REQUIRED") {
      return res.status(403).json({ success: false, message: "Only ADMIN can access users" });
    }
    if (error.message === "COMPANY_CONTEXT_MISSING") {
      return res.status(400).json({ success: false, message: "Company context missing for admin" });
    }

    console.error("Get all users by admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
}
