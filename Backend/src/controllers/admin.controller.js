import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";

const ALLOWED_CREATE_ROLES = ["MANAGER", "EMPLOYEE"];
const ALLOWED_DESIGNATIONS = ["EMPLOYEE", "FINANCE", "DIRECTOR", "CFO", "MANAGER"];
const APPROVAL_STEP_DESIGNATIONS = ["MANAGER", "FINANCE", "DIRECTOR", "CFO"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const APPROVAL_RULE_CONFIG_PREFIX = "APPROVAL_RULE_CONFIG::";

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

function getDefaultApprovalRuleConfig() {
  return {
    managerFirst: true,
    requiredDesignations: ["FINANCE"],
  };
}

function parseApprovalRuleConfig(description) {
  if (!description || typeof description !== "string") {
    return getDefaultApprovalRuleConfig();
  }

  if (!description.startsWith(APPROVAL_RULE_CONFIG_PREFIX)) {
    return getDefaultApprovalRuleConfig();
  }

  const jsonPart = description.slice(APPROVAL_RULE_CONFIG_PREFIX.length);

  try {
    const parsed = JSON.parse(jsonPart);
    return {
      managerFirst: Boolean(parsed?.managerFirst),
      requiredDesignations: Array.isArray(parsed?.requiredDesignations)
        ? parsed.requiredDesignations
            .map((item) => String(item || "").trim().toUpperCase())
            .filter((item) => APPROVAL_STEP_DESIGNATIONS.includes(item))
        : [],
    };
  } catch (_error) {
    return getDefaultApprovalRuleConfig();
  }
}

function serializeApprovalRuleConfig(config) {
  return `${APPROVAL_RULE_CONFIG_PREFIX}${JSON.stringify({
    managerFirst: Boolean(config?.managerFirst),
    requiredDesignations: Array.isArray(config?.requiredDesignations)
      ? config.requiredDesignations
      : [],
  })}`;
}

function serializeApprovalRule(rule) {
  const config = parseApprovalRuleConfig(rule.description);
  const requiredSet = new Set(config.requiredDesignations || []);

  return {
    id: rule.id,
    name: rule.name,
    status: rule.status,
    managerFirst: config.managerFirst,
    steps: (rule.steps || []).map((step) => ({
      id: step.id,
      sequence: step.sequence,
      designation: step.requiredDesignation,
      required: requiredSet.has(step.requiredDesignation),
    })),
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  };
}

async function ensureDefaultApprovalRule(companyId) {
  const existingRule = await prisma.approvalRule.findFirst({
    where: {
      companyId,
      status: "ACTIVE",
    },
    include: {
      steps: {
        orderBy: { sequence: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (existingRule) {
    return existingRule;
  }

  const config = getDefaultApprovalRuleConfig();
  return prisma.approvalRule.create({
    data: {
      companyId,
      name: "Default Expense Rule",
      status: "ACTIVE",
      description: serializeApprovalRuleConfig(config),
      steps: {
        create: [
          {
            sequence: 1,
            requiredDesignation: "FINANCE",
          },
          {
            sequence: 2,
            requiredDesignation: "DIRECTOR",
          },
        ],
      },
    },
    include: {
      steps: {
        orderBy: { sequence: "asc" },
      },
    },
  });
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

/**
 * GET /api/admin/approval-rules
 * ADMIN gets company approval rules (auto-creates default if empty)
 */
export async function getApprovalRulesByAdmin(req, res) {
  try {
    const adminId = req.userId;
    const jwtCompanyId = req.companyId;
    const { companyId } = await getValidatedAdminContext(adminId, jwtCompanyId);

    await ensureDefaultApprovalRule(companyId);

    const rules = await prisma.approvalRule.findMany({
      where: {
        companyId,
        status: "ACTIVE",
      },
      include: {
        steps: {
          orderBy: { sequence: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return res.status(200).json({
      success: true,
      data: {
        rules: rules.map(serializeApprovalRule),
      },
    });
  } catch (error) {
    if (error.message === "ADMIN_NOT_FOUND") {
      return res.status(401).json({ success: false, message: "Admin not found" });
    }
    if (error.message === "ADMIN_INACTIVE") {
      return res.status(403).json({ success: false, message: "Inactive admin cannot access approval rules" });
    }
    if (error.message === "ADMIN_REQUIRED") {
      return res.status(403).json({ success: false, message: "Only ADMIN can access approval rules" });
    }
    if (error.message === "COMPANY_CONTEXT_MISSING") {
      return res.status(400).json({ success: false, message: "Company context missing for admin" });
    }

    console.error("Get approval rules by admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch approval rules",
      error: error.message,
    });
  }
}

/**
 * PUT /api/admin/approval-rules/:ruleId
 * ADMIN updates approval rule sequencing and manager-first config
 */
export async function updateApprovalRuleByAdmin(req, res) {
  try {
    const adminId = req.userId;
    const jwtCompanyId = req.companyId;
    const { companyId } = await getValidatedAdminContext(adminId, jwtCompanyId);

    const ruleId = req.params.ruleId;
    const name = String(req.body?.name || "").trim();
    const managerFirst = Boolean(req.body?.managerFirst);
    const rawSteps = Array.isArray(req.body?.steps) ? req.body.steps : [];

    if (!ruleId) {
      return res.status(400).json({ success: false, message: "ruleId is required" });
    }

    if (!name) {
      return res.status(400).json({ success: false, message: "Rule name is required" });
    }

    if (rawSteps.length === 0) {
      return res.status(400).json({ success: false, message: "At least one approval step is required" });
    }

    const steps = rawSteps.map((step, index) => ({
      sequence: index + 1,
      designation: String(step?.designation || "").trim().toUpperCase(),
      required: Boolean(step?.required),
    }));

    const seen = new Set();
    for (const step of steps) {
      if (!APPROVAL_STEP_DESIGNATIONS.includes(step.designation)) {
        return res.status(400).json({
          success: false,
          message: `Invalid designation in steps: ${step.designation}`,
        });
      }
      if (seen.has(step.designation)) {
        return res.status(400).json({
          success: false,
          message: `Duplicate designation in steps: ${step.designation}`,
        });
      }
      seen.add(step.designation);
    }

    const existingRule = await prisma.approvalRule.findFirst({
      where: {
        id: ruleId,
        companyId,
      },
      select: { id: true },
    });

    if (!existingRule) {
      return res.status(404).json({ success: false, message: "Approval rule not found" });
    }

    const requiredDesignations = steps
      .filter((step) => step.required)
      .map((step) => step.designation);

    const updatedRule = await prisma.$transaction(async (tx) => {
      await tx.approvalStep.deleteMany({
        where: { ruleId },
      });

      const updated = await tx.approvalRule.update({
        where: { id: ruleId },
        data: {
          name,
          description: serializeApprovalRuleConfig({
            managerFirst,
            requiredDesignations,
          }),
          steps: {
            create: steps.map((step) => ({
              sequence: step.sequence,
              requiredDesignation: step.designation,
            })),
          },
        },
        include: {
          steps: {
            orderBy: { sequence: "asc" },
          },
        },
      });

      return updated;
    });

    return res.status(200).json({
      success: true,
      message: "Approval rule updated successfully",
      data: {
        rule: serializeApprovalRule(updatedRule),
      },
    });
  } catch (error) {
    if (error.message === "ADMIN_NOT_FOUND") {
      return res.status(401).json({ success: false, message: "Admin not found" });
    }
    if (error.message === "ADMIN_INACTIVE") {
      return res.status(403).json({ success: false, message: "Inactive admin cannot update approval rules" });
    }
    if (error.message === "ADMIN_REQUIRED") {
      return res.status(403).json({ success: false, message: "Only ADMIN can update approval rules" });
    }
    if (error.message === "COMPANY_CONTEXT_MISSING") {
      return res.status(400).json({ success: false, message: "Company context missing for admin" });
    }

    console.error("Update approval rule by admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update approval rule",
      error: error.message,
    });
  }
}

/**
 * GET /api/admin/pending-expenses
 * ADMIN gets pending expenses in company for approval rule assignment
 */
export async function getPendingExpensesByAdmin(req, res) {
  try {
    const adminId = req.userId;
    const jwtCompanyId = req.companyId;
    const { companyId } = await getValidatedAdminContext(adminId, jwtCompanyId);

    const expenses = await prisma.expense.findMany({
      where: {
        companyId,
        status: "PENDING",
      },
      orderBy: {
        submittedAt: "desc",
      },
      take: 100,
      select: {
        id: true,
        amount: true,
        currencyCode: true,
        description: true,
        submittedAt: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            designation: true,
            managerId: true,
            manager: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                designation: true,
              },
            },
          },
        },
        _count: {
          select: {
            approvalRequests: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        expenses,
      },
    });
  } catch (error) {
    if (error.message === "ADMIN_NOT_FOUND") {
      return res.status(401).json({ success: false, message: "Admin not found" });
    }
    if (error.message === "ADMIN_INACTIVE") {
      return res.status(403).json({ success: false, message: "Inactive admin cannot access pending expenses" });
    }
    if (error.message === "ADMIN_REQUIRED") {
      return res.status(403).json({ success: false, message: "Only ADMIN can access pending expenses" });
    }
    if (error.message === "COMPANY_CONTEXT_MISSING") {
      return res.status(400).json({ success: false, message: "Company context missing for admin" });
    }

    console.error("Get pending expenses by admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending expenses",
      error: error.message,
    });
  }
}

/**
 * POST /api/admin/approval-rules/:ruleId/assign/:expenseId
 * ADMIN generates approval request chain for a pending expense
 */
export async function assignApprovalRuleToExpenseByAdmin(req, res) {
  try {
    const adminId = req.userId;
    const jwtCompanyId = req.companyId;
    const { companyId } = await getValidatedAdminContext(adminId, jwtCompanyId);

    const ruleId = req.params.ruleId;
    const expenseId = req.params.expenseId;

    if (!ruleId || !expenseId) {
      return res.status(400).json({
        success: false,
        message: "ruleId and expenseId are required",
      });
    }

    const [expense, rule] = await Promise.all([
      prisma.expense.findFirst({
        where: {
          id: expenseId,
          companyId,
        },
        select: {
          id: true,
          companyId: true,
          status: true,
          employee: {
            select: {
              id: true,
              managerId: true,
              manager: {
                select: {
                  id: true,
                  status: true,
                  role: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          approvalRequests: {
            select: { id: true },
          },
        },
      }),
      prisma.approvalRule.findFirst({
        where: {
          id: ruleId,
          companyId,
          status: "ACTIVE",
        },
        include: {
          steps: {
            orderBy: { sequence: "asc" },
          },
        },
      }),
    ]);

    if (!expense) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }

    if (expense.status !== "PENDING") {
      return res.status(400).json({ success: false, message: "Approval requests can only be assigned to pending expenses" });
    }

    if (expense.approvalRequests.length > 0) {
      return res.status(400).json({ success: false, message: "Approval requests already exist for this expense" });
    }

    if (!rule) {
      return res.status(404).json({ success: false, message: "Approval rule not found" });
    }

    const config = parseApprovalRuleConfig(rule.description);
    const requiredSet = new Set(config.requiredDesignations || []);

    const chain = [];
    const usedApproverIds = new Set();

    if (config.managerFirst) {
      const employeeManager = expense.employee?.manager;
      if (!employeeManager || employeeManager.status !== "ACTIVE" || employeeManager.role !== "MANAGER") {
        return res.status(400).json({
          success: false,
          message: "Employee must have an active manager for manager-first approval",
        });
      }

      chain.push({
        approverId: employeeManager.id,
        requiredDesignation: "MANAGER",
      });
      usedApproverIds.add(employeeManager.id);
    }

    for (const step of rule.steps) {
      const designation = step.requiredDesignation;

      if (designation === "MANAGER" && config.managerFirst) {
        continue;
      }

      const isRequired = requiredSet.has(designation);

      const approver = await prisma.employee.findFirst({
        where: {
          companyId,
          status: "ACTIVE",
          isApprover: true,
          designation,
        },
        select: {
          id: true,
        },
        orderBy: { createdAt: "asc" },
      });

      if (!approver && isRequired) {
        return res.status(400).json({
          success: false,
          message: `Required approver for designation ${designation} not found`,
        });
      }

      if (!approver) {
        continue;
      }

      if (usedApproverIds.has(approver.id)) {
        continue;
      }

      chain.push({
        approverId: approver.id,
        requiredDesignation: designation,
      });
      usedApproverIds.add(approver.id);
    }

    if (chain.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No eligible approvers found to build approval chain",
      });
    }

    const approvalRequests = await prisma.$transaction(
      chain.map((entry, index) =>
        prisma.approvalRequest.create({
          data: {
            expenseId,
            approverId: entry.approverId,
            sequence: index + 1,
            requiredDesignation: entry.requiredDesignation,
            status: "PENDING",
          },
          select: {
            id: true,
            approverId: true,
            sequence: true,
            requiredDesignation: true,
            status: true,
          },
        })
      )
    );

    return res.status(201).json({
      success: true,
      message: "Approval chain generated successfully",
      data: {
        expenseId,
        ruleId: rule.id,
        approvalRequests,
      },
    });
  } catch (error) {
    if (error.message === "ADMIN_NOT_FOUND") {
      return res.status(401).json({ success: false, message: "Admin not found" });
    }
    if (error.message === "ADMIN_INACTIVE") {
      return res.status(403).json({ success: false, message: "Inactive admin cannot assign approval rules" });
    }
    if (error.message === "ADMIN_REQUIRED") {
      return res.status(403).json({ success: false, message: "Only ADMIN can assign approval rules" });
    }
    if (error.message === "COMPANY_CONTEXT_MISSING") {
      return res.status(400).json({ success: false, message: "Company context missing for admin" });
    }

    console.error("Assign approval rule to expense by admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to assign approval rule",
      error: error.message,
    });
  }
}
