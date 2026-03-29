import { prisma } from "../lib/prisma.js";
import { actOnExpenseApproval } from "./expense.controller.js";

async function getValidatedManagerContext(managerId, jwtCompanyId) {
  const manager = await prisma.employee.findUnique({
    where: { id: managerId },
    select: {
      id: true,
      role: true,
      status: true,
      isApprover: true,
      companyId: true,
    },
  });

  if (!manager) {
    throw new Error("MANAGER_NOT_FOUND");
  }

  if (manager.status !== "ACTIVE") {
    throw new Error("MANAGER_INACTIVE");
  }

  if (manager.role !== "MANAGER") {
    throw new Error("MANAGER_ROLE_REQUIRED");
  }

  if (!manager.isApprover) {
    throw new Error("MANAGER_APPROVER_REQUIRED");
  }

  const companyId = manager.companyId || jwtCompanyId;
  if (!companyId) {
    throw new Error("COMPANY_CONTEXT_MISSING");
  }

  return { manager, companyId };
}

function isApproverSequenceEnabled(expense) {
  const value = expense?.ocrData?.approvalConfigSnapshot?.approverSequence;
  return value === undefined ? true : Boolean(value);
}

function canManagerSeeRequest(request) {
  const allRequests = Array.isArray(request?.expense?.approvalRequests)
    ? [...request.expense.approvalRequests].sort((a, b) => a.sequence - b.sequence)
    : [];

  const sequenceEnabled = isApproverSequenceEnabled(request.expense);
  if (sequenceEnabled) {
    const firstPending = allRequests.find((item) => item.status === "PENDING");
    if (firstPending && firstPending.id !== request.id) {
      return false;
    }
  }

  const employeeManagerId = request?.expense?.employee?.managerId || null;
  if (employeeManagerId && request.approverId !== employeeManagerId) {
    // Check if the employee's direct manager has approved
    const employeeManagerRequest = allRequests.find(
      (item) => item.approverId === employeeManagerId
    );

    // If employee manager's request exists and is NOT approved, hide this request from other managers
    if (employeeManagerRequest && employeeManagerRequest.status !== "APPROVED") {
      return false;
    }
  }

  return true;
}

/**
 * GET /api/manager/approvals-to-review
 * MANAGER gets approvals assigned to them with manager-first visibility rules
 */
export async function getApprovalsToReviewByManager(req, res) {
  try {
    const managerId = req.userId;
    const jwtCompanyId = req.companyId;
    const { manager, companyId } = await getValidatedManagerContext(managerId, jwtCompanyId);

    const assignedRequests = await prisma.approvalRequest.findMany({
      where: {
        approverId: manager.id,
        status: "PENDING",
        expense: {
          companyId,
          status: "PENDING",
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        expense: {
          select: {
            id: true,
            description: true,
            category: true,
            amountInBaseCurrency: true,
            submittedAt: true,
            ocrData: true,
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                managerId: true,
              },
            },
            approvalRequests: {
              select: {
                id: true,
                approverId: true,
                requiredDesignation: true,
                sequence: true,
                status: true,
              },
              orderBy: { sequence: "asc" },
            },
          },
        },
      },
    });

    const visibleRequests = assignedRequests.filter(canManagerSeeRequest);

    const approvals = visibleRequests.map((request) => {
      const ownerName = `${request.expense?.employee?.firstName || ""} ${request.expense?.employee?.lastName || ""}`.trim() || "Unknown";
      return {
        approvalRequestId: request.id,
        expenseId: request.expense?.id,
        subject: request.expense?.description || "none",
        requestOwner: ownerName,
        category: request.expense?.category || "OTHER",
        requestStatus: request.status,
        amountInBaseCurrency: Number(request.expense?.amountInBaseCurrency || 0),
        submittedAt: request.expense?.submittedAt,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        approvals,
      },
    });
  } catch (error) {
    if (error.message === "MANAGER_NOT_FOUND") {
      return res.status(401).json({ success: false, message: "Manager not found" });
    }
    if (error.message === "MANAGER_INACTIVE") {
      return res.status(403).json({ success: false, message: "Inactive manager cannot access approvals" });
    }
    if (error.message === "MANAGER_ROLE_REQUIRED") {
      return res.status(403).json({ success: false, message: "Only MANAGER can access manager approvals" });
    }
    if (error.message === "MANAGER_APPROVER_REQUIRED") {
      return res.status(403).json({ success: false, message: "Manager is not configured as approver" });
    }
    if (error.message === "COMPANY_CONTEXT_MISSING") {
      return res.status(400).json({ success: false, message: "Company context missing" });
    }

    console.error("Get approvals to review by manager error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch manager approvals",
      error: error.message,
    });
  }
}

/**
 * PATCH /api/manager/approvals/:expenseId/action
 * MANAGER approves/rejects assigned expense approval request
 */
export async function actOnApprovalByManager(req, res) {
  return actOnExpenseApproval(req, res);
}

/**
 * GET /api/manager/approval-history
 * MANAGER gets their own approval history (approvals/rejections made)
 */
export async function getApprovalHistoryByManager(req, res) {
  try {
    const managerId = req.userId;
    const jwtCompanyId = req.companyId;
    const { manager, companyId } = await getValidatedManagerContext(managerId, jwtCompanyId);

    let approvalHistories = [];
    
    try {
      approvalHistories = await prisma.approvalHistory.findMany({
        where: {
          approverId: manager.id,
        },
        orderBy: { actionAt: "desc" },
        take: 50,
        include: {
          expense: {
            include: {
              employee: true,
            },
          },
        },
      });
    } catch (prismaError) {
      console.error("Prisma query error in getApprovalHistoryByManager:", prismaError);
      throw prismaError;
    }

    // Filter by company to ensure security
    const filtered = approvalHistories.filter((item) => {
      return item?.expense?.companyId === companyId;
    });

    const history = filtered.map((item) => {
      const employee = item.expense?.employee;
      const employeeName = `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim() || "Unknown";
      const actionLower = String(item.action || "").toLowerCase();
      const statusType = actionLower === "approved" ? "success" : actionLower === "rejected" ? "error" : "default";

      return {
        id: item.id,
        action: actionLower,
        comment: item.comment || null,
        expenseId: item.expense?.id,
        description: item.expense?.description,
        amount: Number(item.expense?.amountInBaseCurrency || 0),
        employeeName,
        statusType,
        actedAt: item.actionAt,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        history,
      },
    });
  } catch (error) {
    if (error.message === "MANAGER_NOT_FOUND") {
      return res.status(401).json({ success: false, message: "Manager not found" });
    }
    if (error.message === "MANAGER_INACTIVE") {
      return res.status(403).json({ success: false, message: "Inactive manager cannot access history" });
    }
    if (error.message === "MANAGER_ROLE_REQUIRED") {
      return res.status(403).json({ success: false, message: "Only MANAGER can access approval history" });
    }
    if (error.message === "MANAGER_APPROVER_REQUIRED") {
      return res.status(403).json({ success: false, message: "Manager is not configured as approver" });
    }
    if (error.message === "COMPANY_CONTEXT_MISSING") {
      return res.status(400).json({ success: false, message: "Company context missing" });
    }

    console.error("Get approval history by manager error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch approval history",
      error: error.message,
    });
  }
}
