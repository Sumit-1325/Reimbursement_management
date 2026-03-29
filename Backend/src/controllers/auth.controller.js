/**
 * Authentication Controller
 * Handles user registration, login, token refresh, and logout
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { generateToken, generateRefreshTokenString, getRefreshTokenExpiry } from "../utils/auth.js";
import { prisma } from "../lib/prisma.js";
import { sendEmail } from "../utils/mail.js";

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

    // Set cookies with tokens
    res.cookie("accessToken", tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
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

    // Set cookies with tokens
    res.cookie("accessToken", tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
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
 * Refresh JWT token using refresh token
 */
export async function refreshToken(req, res) {
  try {
    // Get refresh token from cookies or request body
    const refreshTokenValue = req.cookies?.refreshToken || req.body?.refreshToken;

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

    // Set new access token cookie
    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

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
 * Logout user (invalidate refresh token and clear cookies)
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

    // Clear cookies
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
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


export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET not configured in .env");
      return res.status(500).json({
        success: false,
        message: "Server configuration error: JWT_SECRET not set",
      });
    }

    // Normalize email to lowercase
    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await prisma.employee.findFirst({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
      },
    });

    // Keep response generic to avoid exposing account existence.
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If an account exists with that email, a reset link has been sent.",
      });
    }

    let resetToken;
    try {
      resetToken = jwt.sign(
        { id: user.id, type: "password-reset" },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      );
    } catch (jwtError) {
      console.error("JWT signing error:", jwtError);
      return res.status(500).json({
        success: false,
        message: "Failed to generate reset token",
        error: jwtError.message,
      });
    }

    const frontendBaseUrl = (process.env.FRONTEND_URL || "http://localhost:5173").split(",")[0].trim();
    const resetUrl = `${frontendBaseUrl}/reset-password/${resetToken}`;

    const htmlContent = `
      <h1>Password Reset</h1>
      <p>You requested a password reset. Click the link below to set a new password:</p>
      <a href="${resetUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
      <p>This link expires in 15 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
    `;

    await sendEmail({
      to: email,
      subject: "Password Reset Request",
      html: htmlContent,
    });

    return res.status(200).json({
      success: true,
      message: "If an account exists with that email, a reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    if (error?.code === "MAIL_CONFIG_MISSING") {
      return res.status(400).json({
        success: false,
        message: "Email service is not configured yet. Please set MAIL_HOST, MAIL_PORT, MAIL_USER, and MAIL_PASS in backend .env.",
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to send password reset email",
      error: error.message,
    });
  }
};

// ============================================
// RESET PASSWORD - Set new password using token
// ============================================
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Reset token is required",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "New password is required",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (verifyError) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    if (!decoded?.id || decoded?.type !== "password-reset") {
      return res.status(400).json({
        success: false,
        message: "Invalid reset token",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.employee.update({
      where: { id: decoded.id },
      data: {
        password: hashedPassword,
        refreshToken: null,
        refreshTokenExpiry: null,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Password reset successful. You can now login with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error: error.message,
    });
  }
}