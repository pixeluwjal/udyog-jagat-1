// app/api/referrer/onboarding/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Referrer from "@/models/Referrer";
import jwt from "jsonwebtoken";
import { DecodedToken } from "@/lib/authMiddleware";

interface OnboardingRequest {
    fullName: string;
    mobileNumber: string;
    personalEmail: string;
    residentialAddress: string;
    companyName: string;
    workLocation: string;
    designation: string;
}

export async function PUT(request: Request) {
    await dbConnect();

    // 1. Authenticate referrer
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Unauthorized - No token provided" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    let decodedToken: DecodedToken;

    try {
        if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET not configured");
        decodedToken = jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;

        // Only referrers can complete their onboarding
        if (decodedToken.role !== "job_referrer") {
            return NextResponse.json({ error: "Forbidden - Referrer access required" }, { status: 403 });
        }
    } catch (error) {
        console.error("JWT verification error:", error);
        return NextResponse.json({ error: "Unauthorized - Invalid token" }, { status: 401 });
    }

    try {
        // 2. Parse and validate request body
        const { 
            fullName, 
            mobileNumber, 
            personalEmail, 
            residentialAddress,
            companyName,
            workLocation,
            designation
        }: OnboardingRequest = await request.json();

        // Validate required fields
        if (!fullName || !mobileNumber || !personalEmail || !residentialAddress || 
            !companyName || !workLocation || !designation) {
            return NextResponse.json({ error: "All fields are required" }, { status: 400 });
        }

        // Validate email format for personal email
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalEmail)) {
            return NextResponse.json({ error: "Invalid personal email format" }, { status: 400 });
        }

        // Validate mobile number (basic validation)
        if (!/^\d{10}$/.test(mobileNumber.replace(/\D/g, ''))) {
            return NextResponse.json({ error: "Mobile number must be 10 digits" }, { status: 400 });
        }

        // 3. Find referrer and update onboarding details
        const referrer = await Referrer.findById(decodedToken.id);
        if (!referrer) {
            return NextResponse.json({ error: "Referrer not found" }, { status: 404 });
        }

        // Update referrer details
        referrer.referrerDetails = {
            fullName: fullName.trim(),
            mobileNumber: mobileNumber.trim(),
            personalEmail: personalEmail.trim(),
            residentialAddress: residentialAddress.trim()
        };

        // Update work details
        referrer.workDetails = {
            companyName: companyName.trim(),
            workLocation: workLocation.trim(),
            designation: designation.trim()
        };

        // Mark onboarding as completed
        referrer.onboardingStatus = "completed";

        await referrer.save();

        // 4. Generate new JWT with updated onboarding status
        const payload = {
            id: referrer._id,
            email: referrer.email,
            username: referrer.username,
            role: referrer.role,
            firstLogin: referrer.firstLogin,
            isSuperAdmin: referrer.isSuperAdmin,
            onboardingStatus: referrer.onboardingStatus,
            referralCode: referrer.referralCode,
            milanShakaBhaga: referrer.milanShakaBhaga,
            valayaNagar: referrer.valayaNagar,
            khandaBhaga: referrer.khandaBhaga,
            referrerDetails: referrer.referrerDetails,
            workDetails: referrer.workDetails,
        };

        const newToken = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '1d' });

        // 5. Return updated referrer data
        return NextResponse.json({
            message: "Onboarding completed successfully",
            token: newToken,
            user: {
                id: referrer._id,
                email: referrer.email,
                role: referrer.role,
                onboardingStatus: referrer.onboardingStatus,
                firstLogin: referrer.firstLogin,
                referrerDetails: referrer.referrerDetails,
                workDetails: referrer.workDetails,
                referralCode: referrer.referralCode,
                milanShakaBhaga: referrer.milanShakaBhaga,
                valayaNagar: referrer.valayaNagar,
                khandaBhaga: referrer.khandaBhaga,
            }
        }, { status: 200 });

    } catch (error: any) {
        console.error("Referrer onboarding error:", error);
        return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 });
    }
}