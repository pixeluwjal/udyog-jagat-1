import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User, { IUser, OnboardingStatus } from "@/models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { DecodedToken } from "@/lib/authMiddleware";
import sendEmail from "@/lib/emailservice";

interface CreateUserRequest {
  email: string;
  role: "job_poster" | "job_seeker" | "job_referrer" | "admin";
  isSuperAdmin?: boolean;
}

export async function POST(request: Request) {
  const loginUrl = request.nextUrl.origin;
  await dbConnect();

  // 1. Authentication
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Unauthorized - No token provided" },
      { status: 401 }
    );
  }
  const token = authHeader.split(" ")[1];
  let decodedToken: DecodedToken;

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not configured");
    }
    decodedToken = jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;

    // 2. Authorization
    if (decodedToken.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Unauthorized - Invalid token" },
      { status: 401 }
    );
  }

  try {
    // 3. Parse and validate request
    const { email, role, isSuperAdmin } = await request.json();

    if (!email || !role) {
      return NextResponse.json(
        { error: "Email and role are required" },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // 4. Check permissions
    const allowedRoles = ["job_poster", "job_seeker", "job_referrer"];
    if (!decodedToken.isSuperAdmin && !allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: "Insufficient privileges for this role" },
        { status: 403 }
      );
    }

    if (isSuperAdmin && !decodedToken.isSuperAdmin) {
      return NextResponse.json(
        { error: "Only super admins can create super admins" },
        { status: 403 }
      );
    }

    // 5. Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 }
      );
    }

    // 6. Create new user
    const username = email.split("@")[0];
    const tempPassword = Math.random().toString(36).slice(2, 10);
    const onboardingStatus: OnboardingStatus =
      role === "job_seeker" ? "pending" : "completed";

    const createdUser = await User.create({
      username,
      email,
      password: tempPassword,
      role,
      isSuperAdmin: !!isSuperAdmin,
      firstLogin: true,
      createdBy: decodedToken.id,
      onboardingStatus,
    });

    // 7. Send welcome email with proper HTML formatting
    try {
      await sendEmail({
        to: email,
        subject: "Welcome to Udyog Jagat - Your Account Details",
        text: `Welcome to Udyog Jagat!\n\nYour login details:\nEmail: ${email}\nTemporary Password: ${tempPassword}\n\nPlease login at: ${loginUrl}\n\nPlease change your password after first login.`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Welcome to Udyog Jagat</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #2563eb;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            padding: 20px;
            background-color: #f9fafb;
            border-radius: 0 0 8px 8px;
        }
        .button {
            display: inline-block;
            padding: 10px 20px;
            background-color: #2563eb;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            margin: 15px 0;
        }
        .credentials {
            background-color: #e5e7eb;
            padding: 15px;
            border-radius: 4px;
            margin: 15px 0;
        }
        .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Welcome to Udyog Jagat!</h1>
    </div>
    <div class="content">
        <p>Hello,</p>
        <p>An account has been created for you on Udyog Jagat. Here are your login details:</p>
        
        <div class="credentials">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Temporary Password:</strong> ${tempPassword}</p>
        </div>
        
        <p>Please click the button below to login to your account:</p>
        <a href="${loginUrl}" class="button">Login to Your Account</a>
        
        <p>For security reasons, we recommend that you:</p>
        <ul>
            <li>Change your password immediately after first login</li>
            <li>Never share your login credentials with anyone</li>
            <li>Use a strong, unique password</li>
        </ul>
        
        <p>If you didn't request this account, please contact our support team immediately.</p>
        
        <div class="footer">
            <p>© ${new Date().getFullYear()} Udyog Jagat. All rights reserved.</p>
            <p>This is an automated message, please do not reply directly to this email.</p>
        </div>
    </div>
</body>
</html>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      // Don't fail the request if email fails, just log it
    }

    // 8. Return success response (without sensitive data)
    const userResponse = {
      id: createdUser._id,
      email: createdUser.email,
      role: createdUser.role,
      onboardingStatus: createdUser.onboardingStatus,
      createdAt: createdUser.createdAt,
    };

    return NextResponse.json(
      {
        message: "User created successfully",
        user: userResponse,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("User creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}