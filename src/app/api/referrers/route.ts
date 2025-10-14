// app/api/referrers/route.ts
import { NextResponse } from 'next/server';
import ReferrerModel from '@/models/Referrer';
import dbConnect from '@/lib/dbConnect';

export async function GET() {
  try {
    console.log('🔍 Starting referrers API...');
    
    await dbConnect();
    console.log('✅ Database connected');

    // Get referrers who have completed onboarding
    const referrers = await ReferrerModel.find(
      { 
        role: 'job_referrer',
        status: 'active',
        onboardingStatus: 'completed'
      },
      {
        username: 1,
        email: 1,
        referralCode: 1,
        referrerDetails: 1,
        workDetails: 1,
        jobReferrerDetails: 1,
        onboardingStatus: 1
      }
    ).lean();

    console.log(`✅ Found ${referrers.length} referrers`);

    return NextResponse.json({ 
      success: true,
      referrers: referrers.map(referrer => ({
        ...referrer,
        _id: referrer._id.toString()
      }))
    });

  } catch (error: any) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to fetch referrers' 
      },
      { status: 500 }
    );
  }
}