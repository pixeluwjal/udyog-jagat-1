// /src/app/api/test-db/route.ts
import dbConnect from '@/lib/dbConnect';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await dbConnect();
    return NextResponse.json({ status: 'connected' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'failed to connect' }, { status: 500 });
  }
}
