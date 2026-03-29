import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";

const ALLOWED_CREATE_ROLES = ["MANAGER", "EMPLOYEE"];
const ALLOWED_DESIGNATIONS = ["EMPLOYEE", "FINANCE", "DIRECTOR", "CFO", "MANAGER"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email) {
  return EMAIL_REGEX.test(String(email || "").trim().toLowerCase());
}

function normalizeCreatePayload(payload) {
  const normalizedRole = payload.role?.trim()?.toUpperCase() || "EMPLOYEE";
  const normalizedDesignation = payload.designation?.trim()?.toUpperCase();
  const normalizedManagerId = String(payload.managerId || "").trim() || null;

  const resolvedDesignation =
    normalizedRole === "EMPLOYEE"
      ? "EMPLOYEE"
      : (normalizedDesignation || (normalizedRole === "MANAGER" ? "MANAGER" : "EMPLOYEE"));

  return {
    email: payload.email?.trim()?.toLowerCase(),
    password: payload.password,
    firstName: payload.firstName?.trim(),
    lastName: payload.lastName?.trim() || null,
    role: normalizedRole,
    designation: resolvedDesignation,
    managerId: normalizedManagerId,
    isManager: payload.isManager,
    isApprover: payload.isApprover,
    department: payload.department?.trim() || null,
  };
}

function validateCreatePayload(payload) {
  if (!payload.firstName) {
    return "firstName is required";
  }

  if (!payload.email) {
    return "email is required";
  }

  if (!isValidEmail(payload.email)) {
    return "Invalid email format";
  }

  if (!payload.password) {
    return "password is required";
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
      role: "MANAGER",
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

    if (normalizedPayload.role === "EMPLOYEE" && !normalizedPayload.managerId) {
      return res.status(400).json({
        success: false,
        message: "managerId is required when role is EMPLOYEE",
      });
    }

    if (normalizedPayload.role === "MANAGER") {
      normalizedPayload.managerId = null;
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
      return res.status(400).json({ success: false, message: "managerId must belong to an active MANAGER in same company" });
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
 * PUT /api/admin/users/:userId
 * ADMIN updates user fields except password
 */
export async function updateUserByAdmin(req, res) {
  try {
    const adminId = req.userId;
    const jwtCompanyId = req.companyId;
    const targetUserId = req.params.userId;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    if (Object.prototype.hasOwnProperty.call(req.body || {}, "password")) {
      return res.status(400).json({
        success: false,
        message: "Password cannot be updated from this endpoint",
      });
    }

    const { companyId } = await getValidatedAdminContext(adminId, jwtCompanyId);

    const existingUser = await prisma.employee.findFirst({
      where: {
        id: targetUserId,
        companyId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        designation: true,
        managerId: true,
        department: true,
        status: true,
      },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found in your company",
      });
    }

    const nextEmail = req.body?.email ? req.body.email.trim().toLowerCase() : existingUser.email;
    const nextFirstName = req.body?.firstName ? req.body.firstName.trim() : existingUser.firstName;
    const nextLastName = Object.prototype.hasOwnProperty.call(req.body || {}, "lastName")
      ? (req.body.lastName?.trim() || null)
      : existingUser.lastName;
    const nextRole = req.body?.role ? String(req.body.role).trim().toUpperCase() : existingUser.role;
    let nextDesignation = req.body?.designation
      ? String(req.body.designation).trim().toUpperCase()
      : existingUser.designation;
    const nextDepartment = Object.prototype.hasOwnProperty.call(req.body || {}, "department")
      ? (req.body.department?.trim() || null)
      : existingUser.department;
    const nextStatus = req.body?.status ? String(req.body.status).trim().toUpperCase() : existingUser.status;
    let nextManagerId = Object.prototype.hasOwnProperty.call(req.body || {}, "managerId")
      ? (String(req.body.managerId || "").trim() || null)
      : existingUser.managerId;

    if (!nextEmail || !nextFirstName) {
      return res.status(400).json({
        success: false,
        message: "email and firstName are required",
      });
    }

    if (!isValidEmail(nextEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    const allowedUpdateRoles = ["ADMIN", "MANAGER", "EMPLOYEE"];
    if (!allowedUpdateRoles.includes(nextRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Allowed roles: ADMIN, MANAGER, EMPLOYEE",
      });
    }

    if (!ALLOWED_DESIGNATIONS.includes(nextDesignation)) {
      return res.status(400).json({
        success: false,
        message: "Invalid designation. Allowed: EMPLOYEE, FINANCE, DIRECTOR, CFO, MANAGER",
      });
    }

    if (!["ACTIVE", "INACTIVE", "SUSPENDED"].includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Allowed: ACTIVE, INACTIVE, SUSPENDED",
      });
    }

    if (nextRole === "EMPLOYEE" && !nextManagerId) {
      return res.status(400).json({
        success: false,
        message: "managerId is required when role is EMPLOYEE",
      });
    }

    if (nextRole === "EMPLOYEE") {
      nextDesignation = "EMPLOYEE";
    }

    if (nextRole === "MANAGER" || nextRole === "ADMIN") {
      nextManagerId = null;
    }

    if (nextManagerId && nextManagerId === targetUserId) {
      return res.status(400).json({
        success: false,
        message: "User cannot be assigned as their own manager",
      });
    }

    await validateManagerIfPresent(companyId, nextManagerId);

    if (nextEmail !== existingUser.email) {
      const duplicateEmail = await prisma.employee.findFirst({
        where: {
          companyId,
          email: nextEmail,
          NOT: { id: targetUserId },
        },
        select: { id: true },
      });

      if (duplicateEmail) {
        return res.status(409).json({
          success: false,
          message: "Email already exists in this company",
        });
      }
    }

    const updatedUser = await prisma.employee.update({
      where: { id: targetUserId },
      data: {
        email: nextEmail,
        firstName: nextFirstName,
        lastName: nextLastName,
        role: nextRole,
        designation: nextDesignation,
        managerId: nextManagerId,
        department: nextDepartment,
        status: nextStatus,
        isManager: nextRole === "MANAGER",
        isApprover: nextRole === "MANAGER",
      },
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    if (error.message === "ADMIN_NOT_FOUND") {
      return res.status(401).json({ success: false, message: "Admin not found" });
    }
    if (error.message === "ADMIN_INACTIVE") {
      return res.status(403).json({ success: false, message: "Inactive admin cannot update users" });
    }
    if (error.message === "ADMIN_REQUIRED") {
      return res.status(403).json({ success: false, message: "Only ADMIN can update users" });
    }
    if (error.message === "COMPANY_CONTEXT_MISSING") {
      return res.status(400).json({ success: false, message: "Company context missing for admin" });
    }
    if (error.message === "INVALID_MANAGER") {
      return res.status(400).json({ success: false, message: "managerId must belong to an active MANAGER in same company" });
    }

    console.error("Update user by admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update user",
      error: error.message,
    });
  }
}

/**
 * DELETE /api/admin/users/:userId
 * ADMIN deletes a user in same company
 */
export async function deleteUserByAdmin(req, res) {
  try {
    const adminId = req.userId;
    const jwtCompanyId = req.companyId;
    const targetUserId = req.params.userId;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    if (targetUserId === adminId) {
      return res.status(400).json({
        success: false,
        message: "Admin cannot delete own account",
      });
    }

    const { companyId } = await getValidatedAdminContext(adminId, jwtCompanyId);

    const targetUser = await prisma.employee.findFirst({
      where: {
        id: targetUserId,
        companyId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found in your company",
      });
    }

    await prisma.employee.delete({
      where: { id: targetUserId },
    });

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
      data: {
        user: targetUser,
      },
    });
  } catch (error) {
    if (error.message === "ADMIN_NOT_FOUND") {
      return res.status(401).json({ success: false, message: "Admin not found" });
    }
    if (error.message === "ADMIN_INACTIVE") {
      return res.status(403).json({ success: false, message: "Inactive admin cannot delete users" });
    }
    if (error.message === "ADMIN_REQUIRED") {
      return res.status(403).json({ success: false, message: "Only ADMIN can delete users" });
    }
    if (error.message === "COMPANY_CONTEXT_MISSING") {
      return res.status(400).json({ success: false, message: "Company context missing for admin" });
    }

    console.error("Delete user by admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete user",
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
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
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
