/**
 * Designation-Based Authorization Middleware
 * Handles designation checks, manager verification, and approver validation
 */

/**
 * Verify if user is a manager
 */
export function verifyIsManager(req, res, next) {
  if (!req.user.isManager) {
    return res.status(403).json({
      success: false,
      message: "Only managers can access this resource",
    });
  }
  next();
}

/**
 * Verify if user is an approver
 */
export function verifyIsApprover(req, res, next) {
  if (!req.user.isApprover) {
    return res.status(403).json({
      success: false,
      message: "Only approvers can access this resource",
    });
  }
  next();
}

/**
 * Verify user has specific designation(s)
 */
export function authorizeByDesignation(...allowedDesignations) {
  return (req, res, next) => {
    if (!req.user.designation) {
      return res.status(403).json({
        success: false,
        message: "User designation not found",
      });
    }

    if (!allowedDesignations.includes(req.user.designation)) {
      return res.status(403).json({
        success: false,
        message: `Only users with designation(s): ${allowedDesignations.join(", ")} can access this`,
      });
    }
    next();
  };
}

/**
 * Verify user belongs to the company (companyId in JWT matches resource companyId)
 */
export function verifyCompanyAccess(req, res, next) {
  const resourceCompanyId = req.params.companyId || req.body.companyId;

  if (!resourceCompanyId) {
    return res.status(400).json({
      success: false,
      message: "Company ID required",
    });
  }

  if (req.companyId !== resourceCompanyId) {
    return res.status(403).json({
      success: false,
      message: "Access denied: Company mismatch",
    });
  }
  next();
}

/**
 * Verify user is owner or manager
 */
export function verifyOwnerOrManager(req, res, next) {
  const resourceUserId = req.params.employeeId || req.body.employeeId;

  if (!resourceUserId) {
    return res.status(400).json({
      success: false,
      message: "Employee ID required",
    });
  }

  // Owner or Manager can access
  if (req.userId === resourceUserId || req.user.isManager) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Access denied: Only owner or manager can access",
  });
}

/**
 * Verify user is manager of target employee
 */
export function verifyManagerOf(req, res, next) {
  const targetEmployeeManagerId = req.targetEmployee?.managerId;

  if (!req.user.isManager) {
    return res.status(403).json({
      success: false,
      message: "Only managers can perform this action",
    });
  }

  if (req.userId !== targetEmployeeManagerId) {
    return res.status(403).json({
      success: false,
      message: "You are not the manager of this employee",
    });
  }
  next();
}
