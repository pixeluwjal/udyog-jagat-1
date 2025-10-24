import { NextResponse } from 'next/server';
import ReferrerModel from '@/models/Referrer';
import dbConnect from '@/lib/dbConnect';

export async function GET() {
  try {
    console.log('🔍 Starting referrers API...');
    
    await dbConnect();
    console.log('✅ Database connected');

    // Get ALL active referrers - NO ONBOARDING CHECK
    const referrers = await ReferrerModel.find(
      { 
        role: 'job_referrer',
        status: 'active'
      },
      {
        username: 1,
        email: 1,
        referralCode: 1,
        referrerDetails: 1,
        workDetails: 1,
        jobReferrerDetails: 1,
        onboardingStatus: 1,
        isOnline: 1
      }
    ).lean();

    console.log(`✅ Found ${referrers.length} referrers`);

    // Transform the data to ensure proper structure
    const transformedReferrers = referrers.map(referrer => ({
      ...referrer,
      _id: referrer._id.toString(),
      // Ensure workDetails exists and has proper structure
      workDetails: referrer.workDetails || {
        companyName: '',
        workLocation: '',
        designation: ''
      },
      // Ensure referrerDetails exists and has proper structure
      referrerDetails: referrer.referrerDetails || {
        fullName: referrer.username,
        mobileNumber: '',
        personalEmail: referrer.email,
        residentialAddress: ''
      },
      // Add isOnline status for UI
      isOnline: Math.random() > 0.5 // For demo, you can replace with real online status
    }));

    return NextResponse.json({ 
      success: true,
      referrers: transformedReferrers
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