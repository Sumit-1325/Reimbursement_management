import { prisma } from "../lib/prisma.js";

const ALLOWED_UI_STATES = ["DRAFT", "WAITING_APPROVAL", "APPROVED", "REJECTED"];
const EXCHANGE_RATE_API_KEY = process.env.EXCHANGE_RATE_API_KEY;
const EXCHANGE_RATE_API_BASE = process.env.EXCHANGE_RATE_API_BASE || "https://v6.exchangerate-api.com/v6";
const OPEN_EXCHANGE_RATE_API_BASE = process.env.OPEN_EXCHANGE_RATE_API_BASE || "https://open.er-api.com/v6/latest";
const CATEGORY_MAP = {
  TRAVEL: "TRAVEL",
  MEALS: "MEALS",
  FOOD: "MEALS",
  OFFICE_SUPPLIES: "OFFICE_SUPPLIES",
  ACCOMMODATION: "ACCOMMODATION",
  TRANSPORT: "TRANSPORT",
  OTHER: "OTHER",
};

function normalizeCategory(rawCategory) {
  const normalized = String(rawCategory || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

  return CATEGORY_MAP[normalized] || "OTHER";
}

function normalizeUiState(ocrData, dbStatus) {
  const fromOcr = String(ocrData?.workflowState || "").trim().toUpperCase();
  if (ALLOWED_UI_STATES.includes(fromOcr)) {
    return fromOcr;
  }

  if (dbStatus === "APPROVED") return "APPROVED";
  if (dbStatus === "REJECTED") return "REJECTED";
  return "WAITING_APPROVAL";
}

function ensureApprovalLog(ocrData) {
  const existing = Array.isArray(ocrData?.approvalLog) ? ocrData.approvalLog : [];
  return [...existing];
}

function parseNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

async function getCurrencyRate(fromCurrency, toCurrency) {
  if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) {
    return 1;
  }

  const ratesPayload = await getCurrencyRatesPayload(fromCurrency);
  const rate = ratesPayload?.rates?.[toCurrency];
  return typeof rate === "number" ? rate : null;
}

async function getSupportedCurrencies() {
  if (EXCHANGE_RATE_API_KEY) {
    try {
      const response = await fetch(`${EXCHANGE_RATE_API_BASE}/${EXCHANGE_RATE_API_KEY}/codes`);
      if (response.ok) {
        const payload = await response.json();
        if ((!payload?.result || payload.result === "success") && Array.isArray(payload?.supported_codes)) {
          return payload.supported_codes.map(([code, name]) => ({
            code,
            name,
          }));
        }
      }
    } catch (_error) {
      // Falls through to open API fallback.
    }
  }

  try {
    const response = await fetch(`${OPEN_EXCHANGE_RATE_API_BASE}/USD`);
    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    if (payload?.result && payload.result !== "success") {
      return [];
    }

    const rates = payload?.rates;
    if (!rates || typeof rates !== "object") {
      return [];
    }

    return Object.keys(rates)
      .sort((a, b) => a.localeCompare(b))
      .map((code) => ({ code, name: code }));
  } catch (_error) {
    return [];
  }
}

async function getCurrencyRatesPayload(baseCurrency) {
  const normalizedBase = String(baseCurrency || "USD").trim().toUpperCase();

  if (EXCHANGE_RATE_API_KEY) {
    try {
      const response = await fetch(`${EXCHANGE_RATE_API_BASE}/${EXCHANGE_RATE_API_KEY}/latest/${normalizedBase}`);
      if (response.ok) {
        const payload = await response.json();
        if ((!payload?.result || payload.result === "success") && payload?.conversion_rates) {
          return {
            rates: payload.conversion_rates,
            provider: "exchange-rate-api-key",
            usingApiKey: true,
          };
        }
      }
    } catch (_error) {
      // Falls through to open API fallback.
    }
  }

  try {
    const response = await fetch(`${OPEN_EXCHANGE_RATE_API_BASE}/${normalizedBase}`);
    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    if (payload?.result && payload.result !== "success") {
      return null;
    }

    if (!payload?.rates || typeof payload.rates !== "object") {
      return null;
    }

    return {
      rates: payload.rates,
      provider: "open-er-api-fallback",
      usingApiKey: false,
    };
  } catch (_error) {
    return null;
  }
}

async function getEmployeeContext(employeeId, jwtCompanyId) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      status: true,
      companyId: true,
      company: {
        select: {
          id: true,
          baseCurrency: true,
          currency: true,
          status: true,
        },
      },
    },
  });

  if (!employee) {
    throw new Error("EMPLOYEE_NOT_FOUND");
  }

  if (employee.status !== "ACTIVE") {
    throw new Error("EMPLOYEE_INACTIVE");
  }

  if (employee.role !== "EMPLOYEE") {
    throw new Error("EMPLOYEE_ROLE_REQUIRED");
  }

  const companyId = employee.companyId || jwtCompanyId;
  if (!companyId || employee.company?.id !== companyId) {
    throw new Error("COMPANY_CONTEXT_MISSING");
  }

  if (employee.company?.status !== "ACTIVE") {
    throw new Error("COMPANY_INACTIVE");
  }

  return {
    employee,
    companyId,
    baseCurrency: employee.company?.baseCurrency || employee.company?.currency || "USD",
  };
}

function serializeExpense(expense) {
  const uiState = normalizeUiState(expense.ocrData, expense.status);
  const amount = Number(expense.amount || 0);
  const amountInBaseCurrency = Number(expense.amountInBaseCurrency || 0);

  return {
    id: expense.id,
    employeeId: expense.employeeId,
    amount,
    amountInBaseCurrency,
    currencyCode: expense.currencyCode,
    category: expense.category,
    description: expense.description,
    date: expense.date,
    receiptUrl: expense.receiptUrl,
    remarks: expense.ocrData?.remarks || "",
    paidBy: expense.ocrData?.paidBy || "",
    uiState,
    dbStatus: expense.status,
    canEdit: uiState === "DRAFT",
    submittedAt: expense.submittedAt,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
    approvalLog: ensureApprovalLog(expense.ocrData),
  };
}

function getDisplayName(employee) {
  return `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || employee.email;
}

function getApprovalSnapshot(expense) {
  const snapshot = expense?.ocrData?.approvalConfigSnapshot || {};
  const minPct = Number(snapshot?.minimumApprovalPercentage);

  return {
    managerFirst: snapshot?.managerFirst === undefined ? true : Boolean(snapshot.managerFirst),
    approverSequence: snapshot?.approverSequence === undefined ? true : Boolean(snapshot.approverSequence),
    minimumApprovalPercentage:
      Number.isFinite(minPct) && minPct >= 1 && minPct <= 100 ? Math.round(minPct) : 100,
    requiredDesignations: Array.isArray(snapshot?.requiredDesignations)
      ? snapshot.requiredDesignations.map((item) => String(item || "").trim().toUpperCase()).filter(Boolean)
      : [],
    requiredApproverIds: Array.isArray(snapshot?.requiredApproverIds)
      ? snapshot.requiredApproverIds.map((item) => String(item || "").trim()).filter(Boolean)
      : [],
    cfoOverrideEnabled: snapshot?.cfoOverrideEnabled === undefined ? true : Boolean(snapshot.cfoOverrideEnabled),
  };
}

function getRequiredApproverIdSet(approvalRequests, snapshot) {
  const requiredSet = new Set(snapshot.requiredApproverIds || []);
  const requiredDesignationSet = new Set(snapshot.requiredDesignations || []);

  for (const request of approvalRequests) {
    if (requiredDesignationSet.has(String(request.requiredDesignation || "").toUpperCase())) {
      requiredSet.add(request.approverId);
    }
  }

  return requiredSet;
}

function getApprovalEvaluation(approvalRequests, snapshot) {
  const requiredApproverIdSet = getRequiredApproverIdSet(approvalRequests, snapshot);
  const totalRequests = approvalRequests.length;
  const approvedRequests = approvalRequests.filter((item) => item.status === "APPROVED").length;
  const rejectedRequests = approvalRequests.filter((item) => item.status === "REJECTED").length;
  const pendingRequests = approvalRequests.filter((item) => item.status === "PENDING").length;
  const approvedPercentageRaw = totalRequests === 0 ? 0 : (approvedRequests / totalRequests) * 100;
  const approvedPercentage = Number(approvedPercentageRaw.toFixed(2));
  const threshold = Number.isFinite(Number(snapshot.minimumApprovalPercentage))
    ? Number(snapshot.minimumApprovalPercentage)
    : 100;

  const requiredPending = approvalRequests.some(
    (item) => requiredApproverIdSet.has(item.approverId) && item.status === "PENDING"
  );
  const requiredRejected = approvalRequests.some(
    (item) => requiredApproverIdSet.has(item.approverId) && item.status === "REJECTED"
  );
  const cfoApproved = approvalRequests.some(
    (item) => item.status === "APPROVED" && String(item.approver?.designation || "").toUpperCase() === "CFO"
  );

  const meetsThreshold = approvedPercentage >= threshold;

  if (snapshot.cfoOverrideEnabled && cfoApproved) {
    return {
      finalStatus: "APPROVED",
      workflowState: "APPROVED",
      reason: "CFO_OVERRIDE",
      approvedPercentage,
      requiredPending,
      requiredRejected,
    };
  }

  // Keep workflow pending while approvers are still pending so configured steps can act.
  if (pendingRequests > 0) {
    return {
      finalStatus: "PENDING",
      workflowState: "WAITING_APPROVAL",
      reason: rejectedRequests > 0 ? "WAITING_REMAINING_APPROVALS_AFTER_REJECTION" : "WAITING_REMAINING_APPROVALS",
      approvedPercentage,
      requiredPending,
      requiredRejected,
    };
  }

  if (requiredRejected && pendingRequests === 0) {
    return {
      finalStatus: "REJECTED",
      workflowState: "REJECTED",
      reason: "REQUIRED_APPROVER_REJECTED",
      approvedPercentage,
      requiredPending,
      requiredRejected,
    };
  }

  if (!requiredPending && meetsThreshold) {
    return {
      finalStatus: "APPROVED",
      workflowState: "APPROVED",
      reason: "PERCENTAGE_THRESHOLD_MET",
      approvedPercentage,
      requiredPending,
      requiredRejected,
    };
  }

  if (pendingRequests === 0) {
    return {
      finalStatus: "REJECTED",
      workflowState: "REJECTED",
      reason: "APPROVALS_COMPLETED_THRESHOLD_NOT_MET",
      approvedPercentage,
      requiredPending,
      requiredRejected,
    };
  }
}

async function getApproverContext(userId, jwtCompanyId) {
  const approver = await prisma.employee.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      designation: true,
      status: true,
      isApprover: true,
      companyId: true,
      company: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (!approver) {
    throw new Error("APPROVER_NOT_FOUND");
  }

  if (approver.status !== "ACTIVE") {
    throw new Error("APPROVER_INACTIVE");
  }

  if (!approver.isApprover) {
    throw new Error("APPROVER_REQUIRED");
  }

  const companyId = approver.companyId || jwtCompanyId;
  if (!companyId || approver.company?.id !== companyId) {
    throw new Error("COMPANY_CONTEXT_MISSING");
  }

  if (approver.company?.status !== "ACTIVE") {
    throw new Error("COMPANY_INACTIVE");
  }

  return { approver, companyId };
}

export async function getCompanyEmployeesForExpense(req, res) {
  try {
    const employeeId = req.userId;
    const jwtCompanyId = req.companyId;
    const { companyId } = await getEmployeeContext(employeeId, jwtCompanyId);

    const employees = await prisma.employee.findMany({
      where: {
        companyId,
        status: "ACTIVE",
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        designation: true,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        employees: employees.map((item) => ({
          id: item.id,
          name: getDisplayName(item),
          email: item.email,
          role: item.role,
          designation: item.designation,
        })),
      },
    });
  } catch (error) {
    if (error.message === "EMPLOYEE_NOT_FOUND") {
      return res.status(401).json({ success: false, message: "Employee not found" });
    }
    if (error.message === "EMPLOYEE_INACTIVE") {
      return res.status(403).json({ success: false, message: "Inactive employee cannot access employee list" });
    }
    if (error.message === "EMPLOYEE_ROLE_REQUIRED") {
      return res.status(403).json({ success: false, message: "Only EMPLOYEE can access employee list" });
    }
    if (error.message === "COMPANY_CONTEXT_MISSING") {
      return res.status(400).json({ success: false, message: "Company context missing" });
    }
    if (error.message === "COMPANY_INACTIVE") {
      return res.status(403).json({ success: false, message: "Company is inactive" });
    }

    console.error("Get company employees for expense error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch employee list",
      error: error.message,
    });
  }
}

export async function getSupportedCurrenciesForExpense(req, res) {
  try {
    const employeeId = req.userId;
    const jwtCompanyId = req.companyId;
    const { baseCurrency } = await getEmployeeContext(employeeId, jwtCompanyId);

    const currencies = await getSupportedCurrencies();

    return res.status(200).json({
      success: true,
      data: {
        baseCurrency,
        currencies,
        provider: EXCHANGE_RATE_API_KEY ? "exchange-rate-api-key" : "open-er-api-fallback",
        usingApiKey: Boolean(EXCHANGE_RATE_API_KEY),
      },
    });
  } catch (error) {
    if (error.message === "EMPLOYEE_NOT_FOUND") {
      return res.status(401).json({ success: false, message: "Employee not found" });
    }
    if (error.message === "EMPLOYEE_INACTIVE") {
      return res.status(403).json({ success: false, message: "Inactive employee cannot access currencies" });
    }
    if (error.message === "EMPLOYEE_ROLE_REQUIRED") {
      return res.status(403).json({ success: false, message: "Only EMPLOYEE can access currencies" });
    }
    if (error.message === "COMPANY_CONTEXT_MISSING") {
      return res.status(400).json({ success: false, message: "Company context missing" });
    }
    if (error.message === "COMPANY_INACTIVE") {
      return res.status(403).json({ success: false, message: "Company is inactive" });
    }

    console.error("Get supported currencies error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch supported currencies",
      error: error.message,
    });
  }
}

export async function createExpenseDraftOrSubmit(req, res) {
  try {
    const employeeId = req.userId;
    const jwtCompanyId = req.companyId;
    const { employee, companyId, baseCurrency } = await getEmployeeContext(employeeId, jwtCompanyId);

    const {
      description,
      expenseDate,
      category,
      amount,
      currencyCode,
      paidBy,
      remarks,
      receiptUrl,
      submit = false,
    } = req.body || {};

    const normalizedDescription = String(description || "").trim();
    const normalizedCurrency = String(currencyCode || baseCurrency).trim().toUpperCase();
    const normalizedPaidBy = String(paidBy || `${employee.firstName} ${employee.lastName || ""}`)
      .trim();
    const normalizedRemarks = String(remarks || "").trim();
    const normalizedReceiptUrl = String(receiptUrl || "").trim() || null;
    const parsedAmount = parseNumber(amount);
    const normalizedDate = expenseDate ? new Date(expenseDate) : new Date();

    if (!normalizedDescription) {
      return res.status(400).json({ success: false, message: "description is required" });
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: "amount must be a positive number" });
    }

    if (Number.isNaN(normalizedDate.getTime())) {
      return res.status(400).json({ success: false, message: "expenseDate is invalid" });
    }

    const rate = await getCurrencyRate(normalizedCurrency, baseCurrency);
    const resolvedRate = rate ?? 1;
    const amountInBaseCurrency = Number((parsedAmount * resolvedRate).toFixed(2));
    const workflowState = submit ? "WAITING_APPROVAL" : "DRAFT";

    const approvalLog = [
      {
        action: submit ? "SUBMITTED" : "DRAFT_SAVED",
        actorName: `${employee.firstName} ${employee.lastName || ""}`.trim(),
        actorRole: employee.role,
        comment: submit ? "Expense submitted for approval" : "Expense saved as draft",
        at: new Date().toISOString(),
      },
    ];

    const createdExpense = await prisma.expense.create({
      data: {
        companyId,
        employeeId: employee.id,
        amount: parsedAmount,
        amountInBaseCurrency,
        currencyCode: normalizedCurrency,
        category: normalizeCategory(category),
        description: normalizedDescription,
        date: normalizedDate,
        receiptUrl: normalizedReceiptUrl,
        status: "PENDING",
        ocrData: {
          workflowState,
          baseCurrency,
          conversionRate: resolvedRate,
          conversionProvider: "exchange-rate-api-key",
          conversionFallback: rate === null,
          paidBy: normalizedPaidBy,
          remarks: normalizedRemarks,
          approvalLog,
        },
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: submit ? "Expense submitted successfully" : "Expense draft created successfully",
      data: {
        expense: serializeExpense(createdExpense),
      },
    });
  } catch (error) {
    if (error.message === "EMPLOYEE_NOT_FOUND") {
      return res.status(401).json({ success: false, message: "Employee not found" });
    }
    if (error.message === "EMPLOYEE_INACTIVE") {
      return res.status(403).json({ success: false, message: "Inactive employee cannot create expenses" });
    }
    if (error.message === "EMPLOYEE_ROLE_REQUIRED") {
      return res.status(403).json({ success: false, message: "Only EMPLOYEE can create expenses" });
    }
    if (error.message === "COMPANY_CONTEXT_MISSING") {
      return res.status(400).json({ success: false, message: "Company context missing" });
    }
    if (error.message === "COMPANY_INACTIVE") {
      return res.status(403).json({ success: false, message: "Company is inactive" });
    }

    console.error("Create expense error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create expense",
      error: error.message,
    });
  }
}

export async function getMyExpenses(req, res) {
  try {
    const employeeId = req.userId;
    const jwtCompanyId = req.companyId;
    const { employee, companyId, baseCurrency } = await getEmployeeContext(employeeId, jwtCompanyId);

    const expenses = await prisma.expense.findMany({
      where: {
        companyId,
        employeeId: employee.id,
      },
      orderBy: { createdAt: "desc" },
    });

    const serialized = expenses.map(serializeExpense);

    const summary = {
      draftAmountInBaseCurrency: serialized
        .filter((item) => item.uiState === "DRAFT")
        .reduce((sum, item) => sum + Number(item.amountInBaseCurrency || 0), 0),
      waitingApprovalAmountInBaseCurrency: serialized
        .filter((item) => item.uiState === "WAITING_APPROVAL")
        .reduce((sum, item) => sum + Number(item.amountInBaseCurrency || 0), 0),
      approvedAmountInBaseCurrency: serialized
        .filter((item) => item.uiState === "APPROVED")
        .reduce((sum, item) => sum + Number(item.amountInBaseCurrency || 0), 0),
      baseCurrency,
    };

    return res.status(200).json({
      success: true,
      data: {
        employee: {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
        },
        summary,
        expenses: serialized,
      },
    });
  } catch (error) {
    if (error.message === "EMPLOYEE_NOT_FOUND") {
      return res.status(401).json({ success: false, message: "Employee not found" });
    }
    if (error.message === "EMPLOYEE_INACTIVE") {
      return res.status(403).json({ success: false, message: "Inactive employee cannot access expenses" });
    }
    if (error.message === "EMPLOYEE_ROLE_REQUIRED") {
      return res.status(403).json({ success: false, message: "Only EMPLOYEE can access these expenses" });
    }
    if (error.message === "COMPANY_CONTEXT_MISSING") {
      return res.status(400).json({ success: false, message: "Company context missing" });
    }
    if (error.message === "COMPANY_INACTIVE") {
      return res.status(403).json({ success: false, message: "Company is inactive" });
    }

    console.error("Get my expenses error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch expenses",
      error: error.message,
    });
  }
}

export async function updateDraftExpense(req, res) {
  try {
    const employeeId = req.userId;
    const jwtCompanyId = req.companyId;
    const { employee, companyId, baseCurrency } = await getEmployeeContext(employeeId, jwtCompanyId);
    const expenseId = req.params.expenseId;

    const existingExpense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        companyId,
        employeeId: employee.id,
      },
    });

    if (!existingExpense) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }

    const uiState = normalizeUiState(existingExpense.ocrData, existingExpense.status);
    if (uiState !== "DRAFT") {
      return res.status(400).json({ success: false, message: "Only draft expenses can be edited" });
    }

    const {
      description,
      expenseDate,
      category,
      amount,
      currencyCode,
      paidBy,
      remarks,
      receiptUrl,
    } = req.body || {};

    const nextDescription = String(description || existingExpense.description || "").trim();
    const nextCurrency = String(currencyCode || existingExpense.currencyCode || baseCurrency).trim().toUpperCase();
    const nextPaidBy = String(paidBy || existingExpense.ocrData?.paidBy || "").trim();
    const nextRemarks = String(remarks || existingExpense.ocrData?.remarks || "").trim();
    const nextReceiptUrl = String(receiptUrl || existingExpense.receiptUrl || "").trim() || null;
    const parsedAmount = amount === undefined ? Number(existingExpense.amount) : parseNumber(amount);
    const nextDate = expenseDate ? new Date(expenseDate) : existingExpense.date;

    if (!nextDescription) {
      return res.status(400).json({ success: false, message: "description is required" });
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: "amount must be a positive number" });
    }

    if (Number.isNaN(new Date(nextDate).getTime())) {
      return res.status(400).json({ success: false, message: "expenseDate is invalid" });
    }

    const rate = await getCurrencyRate(nextCurrency, baseCurrency);
    const resolvedRate = rate ?? 1;
    const amountInBaseCurrency = Number((parsedAmount * resolvedRate).toFixed(2));

    const approvalLog = ensureApprovalLog(existingExpense.ocrData);
    approvalLog.push({
      action: "DRAFT_UPDATED",
      actorName: `${employee.firstName} ${employee.lastName || ""}`.trim(),
      actorRole: employee.role,
      comment: "Draft updated",
      at: new Date().toISOString(),
    });

    const updatedExpense = await prisma.expense.update({
      where: { id: existingExpense.id },
      data: {
        amount: parsedAmount,
        amountInBaseCurrency,
        currencyCode: nextCurrency,
        category: normalizeCategory(category || existingExpense.category),
        description: nextDescription,
        date: nextDate,
        receiptUrl: nextReceiptUrl,
        ocrData: {
          ...(existingExpense.ocrData || {}),
          workflowState: "DRAFT",
          baseCurrency,
          conversionRate: resolvedRate,
          conversionProvider: "exchange-rate-api-key",
          conversionFallback: rate === null,
          paidBy: nextPaidBy,
          remarks: nextRemarks,
          approvalLog,
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Draft expense updated successfully",
      data: {
        expense: serializeExpense(updatedExpense),
      },
    });
  } catch (error) {
    if (error.message === "EMPLOYEE_NOT_FOUND") {
      return res.status(401).json({ success: false, message: "Employee not found" });
    }
    if (error.message === "EMPLOYEE_INACTIVE") {
      return res.status(403).json({ success: false, message: "Inactive employee cannot update expenses" });
    }
    if (error.message === "EMPLOYEE_ROLE_REQUIRED") {
      return res.status(403).json({ success: false, message: "Only EMPLOYEE can update expenses" });
    }
    if (error.message === "COMPANY_CONTEXT_MISSING") {
      return res.status(400).json({ success: false, message: "Company context missing" });
    }
    if (error.message === "COMPANY_INACTIVE") {
      return res.status(403).json({ success: false, message: "Company is inactive" });
    }

    console.error("Update draft expense error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update draft expense",
      error: error.message,
    });
  }
}

export async function submitDraftExpense(req, res) {
  try {
    const employeeId = req.userId;
    const jwtCompanyId = req.companyId;
    const { employee, companyId } = await getEmployeeContext(employeeId, jwtCompanyId);
    const expenseId = req.params.expenseId;

    const existingExpense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        companyId,
        employeeId: employee.id,
      },
    });

    if (!existingExpense) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }

    const uiState = normalizeUiState(existingExpense.ocrData, existingExpense.status);
    if (uiState !== "DRAFT") {
      return res.status(400).json({ success: false, message: "Only draft expenses can be submitted" });
    }

    const approvalLog = ensureApprovalLog(existingExpense.ocrData);
    approvalLog.push({
      action: "SUBMITTED",
      actorName: `${employee.firstName} ${employee.lastName || ""}`.trim(),
      actorRole: employee.role,
      comment: "Expense submitted for approval",
      at: new Date().toISOString(),
    });

    const submittedExpense = await prisma.expense.update({
      where: { id: existingExpense.id },
      data: {
        status: "PENDING",
        submittedAt: new Date(),
        ocrData: {
          ...(existingExpense.ocrData || {}),
          workflowState: "WAITING_APPROVAL",
          approvalLog,
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Expense submitted successfully",
      data: {
        expense: serializeExpense(submittedExpense),
      },
    });
  } catch (error) {
    if (error.message === "EMPLOYEE_NOT_FOUND") {
      return res.status(401).json({ success: false, message: "Employee not found" });
    }
    if (error.message === "EMPLOYEE_INACTIVE") {
      return res.status(403).json({ success: false, message: "Inactive employee cannot submit expenses" });
    }
    if (error.message === "EMPLOYEE_ROLE_REQUIRED") {
      return res.status(403).json({ success: false, message: "Only EMPLOYEE can submit expenses" });
    }
    if (error.message === "COMPANY_CONTEXT_MISSING") {
      return res.status(400).json({ success: false, message: "Company context missing" });
    }
    if (error.message === "COMPANY_INACTIVE") {
      return res.status(403).json({ success: false, message: "Company is inactive" });
    }

    console.error("Submit draft expense error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit draft expense",
      error: error.message,
    });
  }
}

export async function getExpenseById(req, res) {
  try {
    const employeeId = req.userId;
    const jwtCompanyId = req.companyId;
    const { employee, companyId } = await getEmployeeContext(employeeId, jwtCompanyId);
    const expenseId = req.params.expenseId;

    const expense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        companyId,
        employeeId: employee.id,
      },
      include: {
        approvalHistories: {
          orderBy: { actionAt: "desc" },
          include: {
            approver: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!expense) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        expense: {
          ...serializeExpense(expense),
          approvalHistory: (expense.approvalHistories || []).map((item) => ({
            id: item.id,
            approver: `${item.approver?.firstName || ""} ${item.approver?.lastName || ""}`.trim(),
            approverEmail: item.approver?.email || null,
            action: item.action,
            approverDesignation: item.approverDesignation,
            comment: item.comment,
            actionAt: item.actionAt,
          })),
        },
      },
    });
  } catch (error) {
    if (error.message === "EMPLOYEE_NOT_FOUND") {
      return res.status(401).json({ success: false, message: "Employee not found" });
    }
    if (error.message === "EMPLOYEE_INACTIVE") {
      return res.status(403).json({ success: false, message: "Inactive employee cannot access expenses" });
    }
    if (error.message === "EMPLOYEE_ROLE_REQUIRED") {
      return res.status(403).json({ success: false, message: "Only EMPLOYEE can access expenses" });
    }
    if (error.message === "COMPANY_CONTEXT_MISSING") {
      return res.status(400).json({ success: false, message: "Company context missing" });
    }
    if (error.message === "COMPANY_INACTIVE") {
      return res.status(403).json({ success: false, message: "Company is inactive" });
    }

    console.error("Get expense by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch expense",
      error: error.message,
    });
  }
}

export async function actOnExpenseApproval(req, res) {
  try {
    const approverId = req.userId;
    const jwtCompanyId = req.companyId;
    const expenseId = req.params.expenseId;
    const action = String(req.body?.action || "").trim().toUpperCase();
    const comment = String(req.body?.comment || "").trim();

    if (!expenseId) {
      return res.status(400).json({ success: false, message: "expenseId is required" });
    }

    if (!["APPROVED", "REJECTED"].includes(action)) {
      return res.status(400).json({ success: false, message: "action must be APPROVED or REJECTED" });
    }

    const { approver, companyId } = await getApproverContext(approverId, jwtCompanyId);

    const result = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.findFirst({
        where: {
          id: expenseId,
          companyId,
        },
        include: {
          employee: {
            select: {
              managerId: true,
            },
          },
          approvalRequests: {
            orderBy: { sequence: "asc" },
            include: {
              approver: {
                select: {
                  id: true,
                  designation: true,
                },
              },
            },
          },
        },
      });

      if (!expense) {
        throw new Error("EXPENSE_NOT_FOUND");
      }

      if (expense.status !== "PENDING") {
        throw new Error("EXPENSE_NOT_PENDING");
      }

      const myRequest = expense.approvalRequests.find((item) => item.approverId === approver.id);
      if (!myRequest) {
        throw new Error("APPROVAL_REQUEST_NOT_ASSIGNED");
      }

      if (myRequest.status !== "PENDING") {
        throw new Error("APPROVAL_REQUEST_ALREADY_COMPLETED");
      }

      const snapshot = getApprovalSnapshot(expense);

      if (snapshot.approverSequence) {
        const firstPending = expense.approvalRequests.find((item) => item.status === "PENDING");
        const isCfoApprover = String(approver.designation || "").toUpperCase() === "CFO";
        const managerFirstEnabled = snapshot.managerFirst === undefined ? true : Boolean(snapshot.managerFirst);
        const employeeManagerId = expense?.employee?.managerId || null;
        const isEmployeeManager = Boolean(employeeManagerId) && approver.id === employeeManagerId;
        const employeeManagerRequest = employeeManagerId
          ? expense.approvalRequests.find((item) => item.approverId === employeeManagerId)
          : null;
        const employeeManagerApproved = employeeManagerRequest ? employeeManagerRequest.status === "APPROVED" : true;
        const isManagerStep = String(myRequest.requiredDesignation || "").toUpperCase() === "MANAGER";

        const canBypassSequenceForManagerStep =
          managerFirstEnabled &&
          isManagerStep &&
          !isEmployeeManager &&
          employeeManagerApproved;

        if (!isCfoApprover && !canBypassSequenceForManagerStep && firstPending && firstPending.id !== myRequest.id) {
          throw new Error("SEQUENCE_NOT_ALLOWED");
        }
      }

      await tx.approvalRequest.update({
        where: { id: myRequest.id },
        data: {
          status: action,
          comment: comment || null,
          completedAt: new Date(),
        },
      });

      await tx.approvalHistory.create({
        data: {
          expenseId: expense.id,
          approverId: approver.id,
          approverDesignation: approver.designation,
          action,
          comment: comment || null,
        },
      });

      const updatedExpense = await tx.expense.findFirst({
        where: { id: expense.id },
        include: {
          approvalRequests: {
            orderBy: { sequence: "asc" },
            include: {
              approver: {
                select: {
                  id: true,
                  designation: true,
                },
              },
            },
          },
        },
      });

      const evaluation = getApprovalEvaluation(updatedExpense.approvalRequests || [], snapshot);
      const approvalLog = ensureApprovalLog(updatedExpense.ocrData);
      approvalLog.push({
        action,
        actorName: `${approver.firstName} ${approver.lastName || ""}`.trim(),
        actorRole: approver.designation || approver.role,
        comment: comment || (action === "APPROVED" ? "Approved" : "Rejected"),
        at: new Date().toISOString(),
      });

      let nextStatus = updatedExpense.status;
      if (evaluation.finalStatus === "APPROVED") {
        nextStatus = "APPROVED";
      } else if (evaluation.finalStatus === "REJECTED") {
        nextStatus = "REJECTED";
      }

      const savedExpense = await tx.expense.update({
        where: { id: updatedExpense.id },
        data: {
          status: nextStatus,
          ocrData: {
            ...(updatedExpense.ocrData || {}),
            workflowState: nextStatus === "APPROVED"
              ? "APPROVED"
              : nextStatus === "REJECTED"
                ? "REJECTED"
                : "WAITING_APPROVAL",
            approvalLog,
          },
        },
      });

      return {
        expense: serializeExpense(savedExpense),
        evaluation,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Approval action recorded successfully",
      data: result,
    });
  } catch (error) {
    if (error.message === "APPROVER_NOT_FOUND") {
      return res.status(401).json({ success: false, message: "Approver not found" });
    }
    if (error.message === "APPROVER_INACTIVE") {
      return res.status(403).json({ success: false, message: "Inactive approver cannot act on approvals" });
    }
    if (error.message === "APPROVER_REQUIRED") {
      return res.status(403).json({ success: false, message: "Only approvers can act on approvals" });
    }
    if (error.message === "EXPENSE_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }
    if (error.message === "EXPENSE_NOT_PENDING") {
      return res.status(400).json({ success: false, message: "Expense is already finalized" });
    }
    if (error.message === "APPROVAL_REQUEST_NOT_ASSIGNED") {
      return res.status(403).json({ success: false, message: "This expense is not assigned to you for approval" });
    }
    if (error.message === "APPROVAL_REQUEST_ALREADY_COMPLETED") {
      return res.status(400).json({ success: false, message: "You already completed this approval request" });
    }
    if (error.message === "SEQUENCE_NOT_ALLOWED") {
      return res.status(400).json({ success: false, message: "Approver sequence is enabled. Wait for previous approver." });
    }
    if (error.message === "COMPANY_CONTEXT_MISSING") {
      return res.status(400).json({ success: false, message: "Company context missing" });
    }
    if (error.message === "COMPANY_INACTIVE") {
      return res.status(403).json({ success: false, message: "Company is inactive" });
    }

    console.error("Act on expense approval error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process approval action",
      error: error.message,
    });
  }
}
