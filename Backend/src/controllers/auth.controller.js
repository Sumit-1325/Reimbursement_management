/**
 * Authentication Controller
 * Handles user registration, login, token refresh, and logout
 */

import bcrypt from "bcryptjs";
import { generateToken, generateRefreshTokenString, getRefreshTokenExpiry } from "../utils/auth.js";
import { prisma } from "../lib/prisma.js";

/**
 * Register a new user - Auto-creates company from country
 */
export async function register(req, res) {
  try {
    const { email, password, firstName, lastName, country, companyName } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedFirstName = firstName?.trim();
    const normalizedLastName = lastName?.trim();
    const normalizedCountry = country?.trim();
    const normalizedCompanyName = companyName?.trim();

    // Validation
    if (!normalizedEmail || !password || !normalizedFirstName || !normalizedLastName || !normalizedCountry || !normalizedCompanyName) {
      return res.status(400).json({
        success: false,
        message: "email, password, firstName, lastName, country, and companyName are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Check if email already exists in database (global check for first signup)
    const existingUser = await prisma.employee.findFirst({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Fetch country details from API for currency
    let currency = "USD";
    try {
      const response = await fetch("https://restcountries.com/v3.1/all?fields=name,currencies");
      const countries = await response.json();
      const countryData = countries.find(
        (c) => c.name?.common?.toLowerCase() === normalizedCountry.toLowerCase()
      );
      
      if (countryData && countryData.currencies) {
        currency = Object.keys(countryData.currencies)[0] || "USD";
      }

      // Validate base currency against exchange rate provider; fallback to USD if unsupported.
      const rateCheck = await fetch(`https://api.exchangerate-api.com/v4/latest/${currency}`);
      if (!rateCheck.ok) {
        currency = "USD";
      }
    } catch (error) {
      console.log("Country API error, using USD as default:", error.message);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create company + admin + defaults atomically to avoid partial records on failure
    const categories = [
      { name: "Travel" },
      { name: "Meals & Entertainment" },
      { name: "Office Supplies" },
      { name: "Equipment" },
      { name: "Software" },
      { name: "Other" },
    ];

    const { company, employee, tokens } = await prisma.$transaction(async (tx) => {
      const createdCompany = await tx.company.create({
        data: {
          name: normalizedCompanyName,
          country: normalizedCountry,
          currency,
          baseCurrency: currency,
          status: "ACTIVE",
        },
      });

      const createdEmployee = await tx.employee.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          role: "ADMIN",
          designation: "EMPLOYEE",
          companyId: createdCompany.id,
          isManager: true,
          isApprover: true,
          status: "ACTIVE",
        },
      });

      await tx.expenseCategory.createMany({
        data: categories.map((cat) => ({
          name: cat.name,
          companyId: createdCompany.id,
          isActive: true,
        })),
      });

      await tx.approvalRule.create({
        data: {
          name: "Default Approval Rule",
          description: "Default approval flow for newly created company",
          companyId: createdCompany.id,
          status: "ACTIVE",
        },
      });

      await tx.companySettings.create({
        data: {
          companyId: createdCompany.id,
          enableOCR: true,
          requireReceiptAboveAmount: 0,
          maxExpenseAmount: 10000,
        },
      });

      const createdTokens = {
        accessToken: generateToken(createdEmployee),
        refreshToken: generateRefreshTokenString(),
      };

      const refreshTokenExpiry = getRefreshTokenExpiry();
      await tx.employee.update({
        where: { id: createdEmployee.id },
        data: {
          refreshToken: createdTokens.refreshToken,
          refreshTokenExpiry,
        },
      });

      return {
        company: createdCompany,
        employee: createdEmployee,
        tokens: createdTokens,
      };
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        employee: {
          id: employee.id,
          email: employee.email,
          firstName: employee.firstName,
          lastName: employee.lastName,
          companyId: company.id,
          role: employee.role,
          designation: employee.designation,
        },
        company: {
          id: company.id,
          name: company.name,
          country: company.country,
          baseCurrency: company.baseCurrency,
        },
        tokens,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
}

/**
 * Login user
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "email and password are required",
      });
    }

    // Find all accounts with same email and match by password
    const employees = await prisma.employee.findMany({
      where: { email: normalizedEmail },
      orderBy: { createdAt: "asc" },
    });

    if (!employees.length) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const passwordMatches = [];
    for (const account of employees) {
      const isPasswordValid = await bcrypt.compare(password, account.password);
      if (isPasswordValid) {
        passwordMatches.push(account);
      }
    }

    if (!passwordMatches.length) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (passwordMatches.length > 1) {
      return res.status(409).json({
        success: false,
        message: "Multiple accounts matched. Please contact admin support.",
      });
    }

    const employee = passwordMatches[0];

    if (employee.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Account is inactive",
      });
    }

    // Generate tokens
    const tokens = {
      accessToken: generateToken(employee),
      refreshToken: generateRefreshTokenString(),
    };

    // Update refresh token
    const refreshTokenExpiry = getRefreshTokenExpiry();
    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        refreshToken: tokens.refreshToken,
        refreshTokenExpiry,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        employee: {
          id: employee.id,
          email: employee.email,
          firstName: employee.firstName,
          lastName: employee.lastName,
          companyId: employee.companyId,
          role: employee.role,
          designation: employee.designation,
        },
        tokens,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
}

/**
 * Admin creates a user in the same company
 */
export async function createEmployeeByAdmin(req, res) {
  try {
    const adminId = req.userId;
    const jwtCompanyId = req.companyId;
    const {
      email,
      password,
      firstName,
      lastName,
      role,
      designation,
      managerId,
      isManager,
      isApprover,
      department,
    } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedDesignation = designation?.trim().toUpperCase();
    const allowedDesignations = ["EMPLOYEE", "FINANCE", "DIRECTOR", "CFO", "MANAGER"];

    if (!normalizedEmail || !password || !firstName) {
      return res.status(400).json({
        success: false,
        message: "email, password, and firstName are required",
      });
    }

    if (designation && !allowedDesignations.includes(normalizedDesignation)) {
      return res.status(400).json({
        success: false,
        message: "Invalid designation. Allowed: EMPLOYEE, FINANCE, DIRECTOR, CFO, MANAGER",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Validate admin exists and fetch authoritative company from DB
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
      return res.status(401).json({
        success: false,
        message: "Admin not found",
      });
    }

    if (admin.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Inactive admin cannot create users",
      });
    }

    if (admin.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Only ADMIN can create users",
      });
    }

    // Use companyId from admin context only
    const companyId = admin.companyId || jwtCompanyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company context missing for admin",
      });
    }

    const existingUser = await prisma.employee.findFirst({
      where: {
        email: normalizedEmail,
        companyId,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already exists in this company",
      });
    }

    if (managerId) {
      const manager = await prisma.employee.findFirst({
        where: {
          id: managerId,
          companyId,
          status: "ACTIVE",
        },
      });

      if (!manager) {
        return res.status(400).json({
          success: false,
          message: "managerId is invalid for this company",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const employee = await prisma.employee.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        firstName: firstName.trim(),
        lastName: lastName ? lastName.trim() : null,
        role: role || "EMPLOYEE",
        designation: normalizedDesignation || "EMPLOYEE",
        companyId,
        managerId: managerId || null,
        isManager: Boolean(isManager),
        isApprover: Boolean(isApprover),
        department: department || null,
        status: "ACTIVE",
      },
    });

    return res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: {
        employee: {
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
        },
      },
    });
  } catch (error) {
    console.error("Create employee error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create employee",
      error: error.message,
    });
  }
}

/**
 * Refresh JWT token using refresh token
 */
export async function refreshToken(req, res) {
  try {
    const { refreshToken: refreshTokenValue } = req.body;

    if (!refreshTokenValue) {
      return res.status(400).json({
        success: false,
        message: "Refresh token required",
      });
    }

    // Find employee with this refresh token
    const employee = await prisma.employee.findFirst({
      where: {
        refreshToken: refreshTokenValue,
        refreshTokenExpiry: {
          gt: new Date(), // Not expired
        },
      },
    });

    if (!employee) {
      return res.status(403).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }

    // Generate new access token
    const newAccessToken = generateToken(employee);

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    return res.status(500).json({
      success: false,
      message: "Token refresh failed",
      error: error.message,
    });
  }
}

/**
 * Logout user (invalidate refresh token)
 */
export async function logout(req, res) {
  try {
    const userId = req.user.id;

    // Invalidate refresh token
    await prisma.employee.update({
      where: { id: userId },
      data: {
        refreshToken: null,
        refreshTokenExpiry: null,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Logout failed",
      error: error.message,
    });
  }
}

/**
 * Get current user profile
 */
export async function getCurrentUser(req, res) {
  try {
    const userId = req.user.id;

    const employee = await prisma.employee.findUnique({
      where: { id: userId },
      include: {
        company: true,
      },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        employee: {
          id: employee.id,
          email: employee.email,
          firstName: employee.firstName,
          lastName: employee.lastName,
          companyId: employee.companyId,
          role: employee.role,
          designation: employee.designation,
          isManager: employee.isManager,
          isApprover: employee.isApprover,
          status: employee.status,
        },
        company: {
          id: employee.company.id,
          name: employee.company.name,
          country: employee.company.country,
          baseCurrency: employee.company.baseCurrency,
        },
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
      error: error.message,
    });
  }
}
