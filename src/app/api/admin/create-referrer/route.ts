import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Referrer from "@/models/Referrer";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { DecodedToken } from "@/lib/authMiddleware";
import sendEmail from "@/lib/emailservice";

// Define the interface for the incoming request body
interface CreateReferrerRequest {
  email: string;
  isSuperAdmin?: boolean;
  milan: string;
  valaya: string;
  khanda: string;
  vibhaaga?: string;
  ghata?: string;
  referrerData: {
    name: string;
    phone: string;
    email: string;
    address: string;
    companyName: string;
    workLocation: string;
    designation: string;
    milan?: string;
    valaya?: string;
    khanda?: string;
    vibhaaga?: string;
    ghata?: string;
  };
}

export async function POST(request: Request) {
  const loginUrl = request.nextUrl.origin;
  await dbConnect();

  // 1. Authenticate admin
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
    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET not configured");
    decodedToken = jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;

    // Only admin or superadmin can create referrers
    if (decodedToken.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }
  } catch (error) {
    console.error("JWT verification error:", error);
    return NextResponse.json(
      { error: "Unauthorized - Invalid token" },
      { status: 401 }
    );
  }

  try {
    // 2. Parse and validate request body
    const requestBody = await request.json();

    console.log("🚨 === REFERRER CREATION BACKEND REQUEST ===");
    console.log("📦 Full request body:", JSON.stringify(requestBody, null, 2));
    console.log("📧 Email:", requestBody.email);
    console.log("🏛️ Milan:", requestBody.milan);
    console.log("🏛️ Valaya:", requestBody.valaya);
    console.log("🏛️ Khanda:", requestBody.khanda);
    console.log("🏛️ Vibhaaga:", requestBody.vibhaaga);
    console.log("🏛️ Ghata:", requestBody.ghata);
    console.log("🔍 Referrer Data:", requestBody.referrerData);
    console.log("🚨 === END REFERRER LOG ===");

    const {
      email,
      isSuperAdmin,
      milan,
      valaya,
      khanda,
      vibhaaga,
      ghata,
      referrerData,
    }: CreateReferrerRequest = requestBody;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // 3. Check permissions based on current user's role
    const currentUser = await User.findById(decodedToken.id);
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if trying to create super admin without super admin privileges
    if (isSuperAdmin && !currentUser.isSuperAdmin) {
      return NextResponse.json(
        { error: "Only super admins can create super admins" },
        { status: 403 }
      );
    }

    // 4. Validate required hierarchy fields for referrers
    console.log("🔍 Validating hierarchy fields for referrer:");
    console.log("🔍 Milan present:", !!milan, "Value:", milan);
    console.log("🔍 Valaya present:", !!valaya, "Value:", valaya);
    console.log("🔍 Khanda present:", !!khanda, "Value:", khanda);

    if (!milan || !valaya || !khanda) {
      console.log(
        "❌ VALIDATION FAILED: Missing hierarchy fields for referrer role"
      );
      return NextResponse.json(
        {
          error:
            "Referrer hierarchy data (Khanda, Valaya, Milan) is required for Referrer roles.",
        },
        { status: 400 }
      );
    }
    console.log(
      "✅ VALIDATION PASSED: All hierarchy fields present for referrer role"
    );

    // 5. Validate referrer data
    if (!referrerData) {
      return NextResponse.json(
        { error: "Referrer data is required" },
        { status: 400 }
      );
    }

    const requiredReferrerFields = [
      "name",
      "phone",
      "companyName",
      "designation",
    ];
    const missingFields = requiredReferrerFields.filter(
      (field) => !referrerData[field as keyof typeof referrerData]
    );

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required referrer fields: ${missingFields.join(
            ", "
          )}`,
        },
        { status: 400 }
      );
    }

    // 6. Check if user already exists in either collection
    const existingUser = await User.findOne({ email });
    const existingReferrer = await Referrer.findOne({ email });

    if (existingUser || existingReferrer) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 }
      );
    }

    // 7. Create referrer
    const username = email.split("@")[0];
    const tempPassword = Math.random().toString(36).slice(2, 10);

    console.log("🎯 Final hierarchy values being stored:");
    console.log("🏛️ Milan:", milan);
    console.log("🏛️ Valaya:", valaya);
    console.log("🏛️ Khanda:", khanda);
    console.log("🏛️ Vibhaaga:", vibhaaga);
    console.log("🏛️ Ghata:", ghata);

    // Create in Referrer collection with onboarding completed
    const createdReferrer = await Referrer.create({
      username,
      email,
      password: tempPassword,
      role: "job_referrer",
      isSuperAdmin: false,
      firstLogin: true,
      createdBy: decodedToken.id,
      onboardingStatus: "completed",
      // Store hierarchy fields
      milan: milan,
      valaya: valaya,
      khanda: khanda,
      vibhaaga: vibhaaga,
      ghata: ghata,
      // Initialize referrer details
      referrerDetails: {
        fullName: referrerData.name,
        mobileNumber: referrerData.phone,
        personalEmail: referrerData.email,
        residentialAddress: referrerData.address || "",
      },
      // Initialize work details
      workDetails: {
        companyName: referrerData.companyName,
        workLocation: referrerData.workLocation || "",
        designation: referrerData.designation,
      },
    });

    const userResponse = {
      id: createdReferrer._id,
      email: createdReferrer.email,
      role: createdReferrer.role,
      onboardingStatus: createdReferrer.onboardingStatus,
      createdAt: createdReferrer.createdAt,
      milan: createdReferrer.milan,
      valaya: createdReferrer.valaya,
      khanda: createdReferrer.khanda,
      vibhaaga: createdReferrer.vibhaaga,
      ghata: createdReferrer.ghata,
      referralCode: createdReferrer.referralCode,
      referrerDetails: createdReferrer.referrerDetails,
      workDetails: createdReferrer.workDetails,
    };

    console.log("✅ Referrer created successfully:", {
      id: createdReferrer._id,
      email: createdReferrer.email,
      role: createdReferrer.role,
      milan: createdReferrer.milan,
      valaya: createdReferrer.valaya,
      khanda: createdReferrer.khanda,
    });

    // 8. Send welcome email
    try {
      await sendEmail({
        to: email,
        subject: "Welcome to Udyog Jagat - Your Referrer Account Details",
        text: `Welcome to Udyog Jagat as a Referrer!\n\nYour login details:\nEmail: ${email}\nTemporary Password: ${tempPassword}\n\nPlease login at: ${loginUrl}\n\nPlease change your password after first login.`,
        html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Welcome to Udyog Jagat - Referrer Account</title>
<style>
body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
.header { background-color: #8B5CF6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
.content { padding: 20px; background-color: #f9fafb; border-radius: 0 0 8px 8px; }
.button { display: inline-block; padding: 10px 20px; background-color: #8B5CF6; color: white; text-decoration: none; border-radius: 4px; margin: 15px 0; }
.credentials { background-color: #e5e7eb; padding: 15px; border-radius: 4px; margin: 15px 0; }
.footer { margin-top: 20px; font-size: 12px; color: #6b7280; text-align: center; }
.referrer-badge { background-color: #8B5CF6; color: white; padding: 5px 10px; border-radius: 20px; font-size: 12px; display: inline-block; margin-left: 10px; }
</style>
</head>
<body>
<div class="header">
  <h1>Welcome to Udyog Jagat! <span class="referrer-badge">Referrer</span></h1>
</div>
<div class="content">
  <p>Hello ${referrerData.name},</p>
  <p>A referrer account has been created for you on Udyog Jagat. Here are your login details:</p>
  <div class="credentials">
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Temporary Password:</strong> ${tempPassword}</p>
    <p><strong>Role:</strong> Referrer</p>
  </div>
  <p>Please click the button below to login to your account:</p>
  <a href="${loginUrl}" class="button">Login to Your Referrer Account</a>
  <p>For security reasons, we recommend that you:</p>
  <ul>
    <li>Change your password immediately after first login</li>
    <li>Never share your login credentials with anyone</li>
    <li>Use a strong, unique password</li>
  </ul>
  <p><strong>Referrer Benefits:</strong></p>
  <ul>
    <li>Refer candidates to job opportunities</li>
    <li>Track your referrals and earnings</li>
    <li>Build your professional network</li>
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
    }

    // 9. Return response
    return NextResponse.json(
      {
        message: "Referrer created successfully",
        user: userResponse,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("❌ Referrer creation error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
