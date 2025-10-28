import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User, { IUser, OnboardingStatus } from "@/models/User";
import Referrer, { IReferrer } from "@/models/Referrer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { DecodedToken } from "@/lib/authMiddleware";
import sendEmail from "@/lib/emailservice";

// Define the interface for the incoming request body
interface CreateUserRequest {
  email: string;
  role: "job_poster" | "job_seeker" | "job_referrer" | "admin";
  isSuperAdmin?: boolean;
  milan?: string;
  valaya?: string;
  khanda?: string;
  vibhaaga?: string;
  ghata?: string;
  referrerData?: any;
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

    // Only admin or superadmin can create users
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
    
    console.log("🚨 === BACKEND RECEIVED REQUEST ===");
    console.log("📦 Full request body:", JSON.stringify(requestBody, null, 2));
    console.log("🎯 Role:", requestBody.role);
    console.log("🏛️ Milan:", requestBody.milan);
    console.log("🏛️ Valaya:", requestBody.valaya);
    console.log("🏛️ Khanda:", requestBody.khanda);
    console.log("🏛️ Vibhaaga:", requestBody.vibhaaga);
    console.log("🏛️ Ghata:", requestBody.ghata);
    console.log("📧 Email:", requestBody.email);
    console.log("👑 isSuperAdmin:", requestBody.isSuperAdmin);
    console.log("🔍 Referrer Data:", requestBody.referrerData);
    console.log("🚨 === END BACKEND LOG ===");

    const {
      email,
      role,
      isSuperAdmin,
      milan,
      valaya,
      khanda,
      vibhaaga,
      ghata,
      referrerData,
    }: CreateUserRequest = requestBody;

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

    // 3. Check permissions based on current user's role
    const currentUser = await User.findById(decodedToken.id);
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Define allowed roles based on current user's privileges
    let allowedRoles: string[];

    if (currentUser.isSuperAdmin) {
      // SuperAdmin can create all roles including other SuperAdmins
      allowedRoles = ["job_seeker", "job_poster", "job_referrer", "admin"];
    } else if (currentUser.role === "admin") {
      // Regular Admin can only create seeker, referrer, and poster
      allowedRoles = ["job_seeker", "job_poster", "job_referrer"];
    } else {
      return NextResponse.json(
        { error: "Insufficient privileges" },
        { status: 403 }
      );
    }

    // Check if the requested role is allowed
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        {
          error: `Insufficient privileges to create ${role} role. Allowed roles: ${allowedRoles.join(
            ", "
          )}`,
        },
        { status: 403 }
      );
    }

    // Check if trying to create super admin without super admin privileges
    if (isSuperAdmin && !currentUser.isSuperAdmin) {
      return NextResponse.json(
        { error: "Only super admins can create super admins" },
        { status: 403 }
      );
    }

    // Conditional validation based on role
    console.log("🔍 Validating hierarchy fields for role:", role);
    console.log("🔍 Milan present:", !!milan, "Value:", milan);
    console.log("🔍 Valaya present:", !!valaya, "Value:", valaya);
    console.log("🔍 Khanda present:", !!khanda, "Value:", khanda);

    if (role === "admin") {
      // For admin roles, require hierarchy fields (GHATA IS OPTIONAL)
      if (!milan || !valaya || !khanda) {
        console.log("❌ VALIDATION FAILED: Missing hierarchy fields for admin role");
        console.log("❌ Milan missing:", !milan);
        console.log("❌ Valaya missing:", !valaya);
        console.log("❌ Khanda missing:", !khanda);
        return NextResponse.json(
          {
            error: "Milan, Valaya, and Khanda are required for Admin roles.",
          },
          { status: 400 }
        );
      }
      console.log("✅ VALIDATION PASSED: All hierarchy fields present for admin role");
      // GHATA IS OPTIONAL - NO VALIDATION NEEDED
    } else if (role === "job_referrer") {
      // For referrers, check hierarchy from multiple sources
      const hasDirectHierarchy = milan && valaya && khanda;
      const hasReferrerDataHierarchy = referrerData && referrerData.khanda && referrerData.valaya && referrerData.milan;
      
      if (!hasDirectHierarchy && !hasReferrerDataHierarchy) {
        return NextResponse.json(
          {
            error: "Referrer hierarchy data (Khanda, Valaya, Milan) is required for Referrer roles.",
          },
          { status: 400 }
        );
      }
      // GHATA IS OPTIONAL - NO VALIDATION NEEDED
    }

    // 4. Check if user already exists in either collection
    const existingUser = await User.findOne({ email });
    const existingReferrer = await Referrer.findOne({ email });

    if (existingUser || existingReferrer) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 }
      );
    }

    // 5. Create user based on role
    const username = email.split("@")[0];
    const tempPassword = Math.random().toString(36).slice(2, 10);

    let createdUser;
    let userResponse;

    // Determine hierarchy values based on role and data source
    let finalMilan = milan;
    let finalValaya = valaya;
    let finalKhanda = khanda;
    let finalVibhaaga = vibhaaga;
    let finalGhata = ghata; // GHATA IS OPTIONAL

    // For referrers, use data from multiple sources
    if (role === "job_referrer") {
      // Priority 1: Use direct fields from main payload
      if (milan) finalMilan = milan;
      if (valaya) finalValaya = valaya;
      if (khanda) finalKhanda = khanda;
      
      // Priority 2: Use fields from referrerData
      if (referrerData) {
        if (referrerData.milan) finalMilan = referrerData.milan;
        if (referrerData.valaya) finalValaya = referrerData.valaya;
        if (referrerData.khanda) finalKhanda = referrerData.khanda;
        
        finalVibhaaga = referrerData.vibhaaga || vibhaaga;
        finalGhata = referrerData.ghata || ghata; // GHATA IS OPTIONAL
      }
    }

    console.log("🎯 Final hierarchy values being stored:");
    console.log("🏛️ Milan:", finalMilan);
    console.log("🏛️ Valaya:", finalValaya);
    console.log("🏛️ Khanda:", finalKhanda);
    console.log("🏛️ Vibhaaga:", finalVibhaaga);
    console.log("🏛️ Ghata:", finalGhata);

    if (role === "job_referrer") {
      // Create in Referrer collection with onboarding not started
      const onboardingStatus: OnboardingStatus = "completed";

      createdUser = await Referrer.create({
        username,
        email,
        password: tempPassword,
        role: "job_referrer",
        isSuperAdmin: false,
        firstLogin: true,
        createdBy: decodedToken.id,
        onboardingStatus,
        // STORE WITH FIELD NAMES IN DATABASE
        milan: finalMilan!,
        valaya: finalValaya!,
        khanda: finalKhanda!,
        vibhaaga: finalVibhaaga, // OPTIONAL
        ghata: finalGhata, // OPTIONAL - CAN BE UNDEFINED
        // Initialize empty referrer details for onboarding
        referrerDetails: {
          fullName: referrerData?.name || referrerData?.fullName || "",
          mobileNumber: referrerData?.phone || referrerData?.mobileNumber || "",
          personalEmail: referrerData?.email || email,
          residentialAddress: referrerData?.address || referrerData?.residentialAddress || "",
        },
        // Initialize empty work details for onboarding
        workDetails: {
          companyName: referrerData?.companyName || "",
          workLocation: referrerData?.workLocation || "",
          designation: referrerData?.designation || "",
        },
      });

      userResponse = {
        id: createdUser._id,
        email: createdUser.email,
        role: createdUser.role,
        onboardingStatus: createdUser.onboardingStatus,
        createdAt: createdUser.createdAt,
        milan: createdUser.milan,
        valaya: createdUser.valaya,
        khanda: createdUser.khanda,
        vibhaaga: createdUser.vibhaaga,
        ghata: createdUser.ghata,
        referralCode: createdUser.referralCode,
      };
    } else {
      // Create in User collection for other roles
      const onboardingStatus: OnboardingStatus =
        role === "job_seeker" ? "not_started" : "completed";

      createdUser = await User.create({
        username,
        email,
        password: tempPassword,
        role,
        isSuperAdmin: !!isSuperAdmin,
        firstLogin: true,
        createdBy: decodedToken.id,
        onboardingStatus,
        // STORE WITH FIELD NAMES IN DATABASE
        milan: finalMilan || undefined,
        valaya: finalValaya || undefined,
        khanda: finalKhanda || undefined,
        vibhaaga: finalVibhaaga || undefined,
        ghata: finalGhata || undefined, // OPTIONAL
      });

      userResponse = {
        id: createdUser._id,
        email: createdUser.email,
        role: createdUser.role,
        onboardingStatus: createdUser.onboardingStatus,
        createdAt: createdUser.createdAt,
        milan: createdUser.milan,
        valaya: createdUser.valaya,
        khanda: createdUser.khanda,
        vibhaaga: createdUser.vibhaaga,
        ghata: createdUser.ghata,
      };
    }

    console.log("✅ User created successfully:", {
      id: createdUser._id,
      email: createdUser.email,
      role: createdUser.role,
      milan: createdUser.milan,
      valaya: createdUser.valaya,
      khanda: createdUser.khanda
    });

    // 6. Send welcome email
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
body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
.header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
.content { padding: 20px; background-color: #f9fafb; border-radius: 0 0 8px 8px; }
.button { display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 4px; margin: 15px 0; }
.credentials { background-color: #e5e7eb; padding: 15px; border-radius: 4px; margin: 15px 0; }
.footer { margin-top: 20px; font-size: 12px; color: #6b7280; text-align: center; }
</style>
</head>
<body>
<div class="header"><h1>Welcome to Udyog Jagat!</h1></div>
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
    }

    // 7. Return response
    return NextResponse.json(
      {
        message: "User created successfully",
        user: userResponse,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("❌ User creation error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}