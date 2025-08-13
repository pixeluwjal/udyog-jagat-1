import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import ReferralCodeModel from "@/models/ReferralCode";
import jwt from "jsonwebtoken";
import { DecodedToken } from "@/lib/authMiddleware";
import sendEmail from "@/lib/emailservice";

// Define the interface for the incoming request body
interface GenerateCodeRequest {
  candidateEmail: string;
  durationValue: number;
  durationUnit: "minutes" | "hours" | "days";
}

async function generateUniqueCode(length: number = 8): Promise<string> {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  let codeExists = true;
  let attempts = 0;
  const maxAttempts = 10;

  while (codeExists && attempts < maxAttempts) {
    result = "";
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    const existingCode = await ReferralCodeModel.findOne({ code: result });
    codeExists = !!existingCode;
    attempts++;
  }

  if (codeExists) {
    throw new Error(
      "Failed to generate a unique referral code after multiple attempts."
    );
  }
  return result;
}

export async function POST(request: Request) {
  await dbConnect();
  console.log("\n--- API: /api/admin/generate-referral-code POST ---");

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
      return NextResponse.json(
        { error: "Server configuration error." },
        { status: 500 }
      );
    }
    decodedToken = jwt.verify(
      token,
      process.env.JWT_SECRET
    ) as DecodedToken;

    if (decodedToken.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Only admins can generate referral codes." },
        { status: 403 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: `Unauthorized - Invalid token: ${error.message}` },
      { status: 401 }
    );
  }

  try {
    const { candidateEmail, durationValue, durationUnit }: GenerateCodeRequest =
      await request.json();

    if (
      !candidateEmail ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidateEmail)
    ) {
      return NextResponse.json(
        { error: "Valid candidate email is required." },
        { status: 400 }
      );
    }

    if (
      durationValue <= 0 ||
      !["minutes", "hours", "days"].includes(durationUnit)
    ) {
      return NextResponse.json(
        { error: "Valid duration value and unit are required." },
        { status: 400 }
      );
    }

    // 🔹 Fix old 'pending' statuses automatically
    await User.updateMany(
      { onboardingStatus: "pending" },
      { $set: { onboardingStatus: "not_started" } }
    );

    let user = await User.findOne({ email: candidateEmail });
    const generatedCode = await generateUniqueCode();
    let isNewUser = false;
    let temporaryPassword = "";

    const expiresAt = new Date();
    switch (durationUnit) {
      case "minutes":
        expiresAt.setMinutes(expiresAt.getMinutes() + durationValue);
        break;
      case "hours":
        expiresAt.setHours(expiresAt.getHours() + durationValue);
        break;
      case "days":
      default:
        expiresAt.setDate(expiresAt.getDate() + durationValue);
        break;
    }

    const adminUser = await User.findById(decodedToken.id);
    if (!adminUser) {
      return NextResponse.json(
        { error: "Generating admin user not found." },
        { status: 500 }
      );
    }
    const generatedByAdminUsername = adminUser.username || adminUser.email;

    if (!user) {
      isNewUser = true;
      const username = candidateEmail.split("@")[0];
      temporaryPassword = Math.random().toString(36).substring(2, 10);

      user = new User({
        username,
        email: candidateEmail,
        password: temporaryPassword,
        role: "job_seeker",
        firstLogin: true,
        isSuperAdmin: false,
        createdBy: decodedToken.id,
        onboardingStatus: "not_started", // ✅ valid enum value
      });
      await user.save();
    } else {
      if (
        user.role === "job_seeker" &&
        user.onboardingStatus !== "completed"
      ) {
        user.firstLogin = true;
        user.onboardingStatus = "not_started"; // ✅ valid enum value
        await user.save();
      }
    }

    const newReferralCode = new ReferralCodeModel({
      code: generatedCode,
      candidateEmail,
      expiresAt,
      generatedByAdminId: decodedToken.id,
      generatedByAdminUsername,
      isUsed: false,
    });
    await newReferralCode.save();

    const loginUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/login`;
    const portalName =
      process.env.NEXT_PUBLIC_PORTAL_NAME || "Udyog Jagat";
    const teamName =
      process.env.EMAIL_FROM?.split("<")[0].trim() ||
      "Udyog Jagat Team";

    const durationText = `${durationValue} ${durationUnit}`;
    const emailSubject = "Your Udyog Jagat Portal Access Code!";

    const emailText = `Hello ${user.username},

An administrator has generated an exclusive access code for you to log in to ${portalName} Portal.

Your Access Code: ${generatedCode}

This code is valid for ${durationText} from now and is for one-time use only.

Please use it to log in and complete your profile here: ${loginUrl}

${
  isNewUser
    ? `Your temporary password is: ${temporaryPassword} (You will be prompted to change this on first login.)\n\n`
    : ""
}We look forward to having you!

${teamName}`;

    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <body>
      <p>Hello <strong>${user.username}</strong>,</p>
      <p>An administrator has generated an exclusive access code for you to log in to ${portalName} Portal.</p>
      <h2>${generatedCode}</h2>
      <p>This code is valid for <strong>${durationText}</strong> from now and is for one-time use only.</p>
      <p><a href="${loginUrl}">Log in</a> and complete your profile.</p>
      ${
        isNewUser
          ? `<p>Your temporary password is: <strong>${temporaryPassword}</strong></p>`
          : ""
      }
      <p>We look forward to having you!</p>
      <p>${teamName}</p>
    </body>
    </html>
    `;

    try {
      await sendEmail({
        to: candidateEmail,
        subject: emailSubject,
        text: emailText,
        html: emailHtml,
      });
    } catch (emailError) {
      console.error("Failed to send email:", emailError);
    }

    return NextResponse.json(
      {
        message: `Referral code generated and email sent to ${candidateEmail}!`,
        code: generatedCode,
        expiresAt,
        isNewUser,
        generatedByAdminUsername,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}
