import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/authMiddleware';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';

// Define the response schema (optional, for type safety)
interface FormResponse {
  fieldId: string;
  fieldType: string;
  fieldLabel: string;
  value: any;
  _id: mongoose.Types.ObjectId;
}

interface ReferrerResponseDocument extends mongoose.Document {
  formId: mongoose.Types.ObjectId;
  formTitle: string;
  formSlug: string;
  formType: string;
  collection: string;
  responses: FormResponse[];
  ipAddress: string;
  userAgent: string;
  submittedAt: string | Date;
  __v: number;
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication using your existing authMiddleware
    const authResult = await authMiddleware(request, ['admin', 'super_admin']);

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.message },
        { status: authResult.status || 401 }
      );
    }

    // Check if organization database URI is configured
    if (!process.env.ORG_MONGODB_URI) {
      console.error('ORG_MONGODB_URI environment variable is not configured');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Organization database configuration missing',
          responses: [] // Return empty array instead of error for better UX
        },
        { status: 200 }
      );
    }

    // Connect to the organization database using Mongoose
    let orgConnection: typeof mongoose;
    
    try {
      // Create a new connection to the organization database
      orgConnection = await mongoose.createConnection(process.env.ORG_MONGODB_URI).asPromise();
      console.log('Connected to organization database');
    } catch (dbError: any) {
      console.error('Failed to connect to organization database:', dbError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot connect to organization database',
          responses: [] 
        },
        { status: 200 }
      );
    }

    // Form ID for Swayamsevak Registration form
    const FORM_ID = '68f7127ecee71159b1b2af1c';
    
    try {
      // Get the responses collection directly
      const responsesCollection = orgConnection.collection('formresponses');
      
      const referrerResponses = await responsesCollection
        .find({ 
          formId: new mongoose.Types.ObjectId(FORM_ID) 
        })
        .sort({ submittedAt: -1 }) // Sort by most recent first
        .toArray();

      console.log(`Found ${referrerResponses.length} referrer responses`);

      // Close the organization database connection
      await orgConnection.close();

      // Transform the responses to include only necessary data
      const transformedResponses = referrerResponses.map((response: any) => ({
        _id: response._id.toString(),
        formId: response.formId?.toString() || FORM_ID,
        formTitle: response.formTitle || 'Swayamsevak Registration',
        responses: response.responses || [],
        submittedAt: response.submittedAt,
        ipAddress: response.ipAddress,
        userAgent: response.userAgent
      }));

      return NextResponse.json({
        success: true,
        responses: transformedResponses,
        count: transformedResponses.length
      });

    } catch (queryError: any) {
      // Close connection on error
      await orgConnection.close();
      console.error('Error querying responses:', queryError);
      throw queryError;
    }

  } catch (error: any) {
    console.error('Error fetching referrer responses:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch referrer responses',
        responses: [] // Return empty array on error for better UX
      },
      { status: 500 }
    );
  }
}