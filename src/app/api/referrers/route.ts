// app/api/referrers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { authMiddleware } from "@/lib/authMiddleware";
import { serverClient } from "@/lib/stream-chat";
import User from "@/models/User"; // Make sure this path is correct

export async function GET(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.message }, { status: authResult.status || 401 });
    }
    const currentUserId = authResult.user._id;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "25");
    const skip = (page - 1) * limit;

    const referrers = await User.find({ role: "job_referrer", _id: { $ne: currentUserId } })
      .select("firstName lastName username profileImage company position")
      .limit(limit)
      .skip(skip)
      .lean();

    if (referrers.length === 0) {
      return NextResponse.json({ referrers: [], hasMore: false });
    }

    const mergedReferrers = referrers.map(referrer => {
      const referrerIdStr = referrer._id.toString();
      return {
        _id: referrerIdStr,
        id: referrerIdStr,
        name: `${referrer.firstName} ${referrer.lastName}`,
        profileImage: referrer.profileImage,
        position: referrer.position,
        company: referrer.company,
      };
    });

    return NextResponse.json({
        referrers: mergedReferrers,
        hasMore: referrers.length === limit,
    });

  } catch (error: any) {
    console.error("❌ API Error in /api/referrers:", error);
    return NextResponse.json({ 
      error: "Failed to fetch referrers.",
      details: error.message 
    }, { status: 500 });
  }
}