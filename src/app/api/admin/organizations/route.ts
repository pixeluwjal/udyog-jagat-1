import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

export async function GET(request: NextRequest) {
  let client;
  
  try {
    const orgMongoUri = process.env.ORG_MONGODB_URI;
    
    if (!orgMongoUri) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Organization database connection string not configured' 
        },
        { status: 500 }
      );
    }

    // Connect to the organizations database (ss)
    client = new MongoClient(orgMongoUri);
    await client.connect();
    
    const db = client.db('ss');
    const organizationsCollection = db.collection('organizations');
    
    // Fetch all organizations
    const organizations = await organizationsCollection.find({}).toArray();
    
    return NextResponse.json({
      success: true,
      organizations: organizations
    });
    
  } catch (error: any) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch organizations',
        details: error.message 
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}