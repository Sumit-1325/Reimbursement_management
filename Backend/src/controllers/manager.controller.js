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
    const employeeManagerRequest = allRequests.find(
      (item) =>
        item.approverId === employeeManagerId &&
        String(item.requiredDesignation || "").toUpperCase() === "MANAGER"
    );

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
