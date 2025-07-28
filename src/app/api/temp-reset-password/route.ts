// app/api/temp-reset-password/route.ts (for App Router)
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function GET() { // Using GET for simplicity, but POST is generally safer
  await dbConnect();

  try {
    const adminEmail = "admin@jobportal.com";
    const newPlainPassword = "a"; // <<< SET YOUR NEW PASSWORD HERE!

    const hashedPassword = await bcrypt.hash(newPlainPassword, 10); // Use the same salt rounds as registration

    const user = await User.findOneAndUpdate(
      { email: adminEmail },
      { password: hashedPassword },
      { new: true } // Return the updated document
    );

    if (!user) {
      console.log(`User ${adminEmail} not found for password reset.`);
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    console.log(`Password for ${adminEmail} successfully updated!`);
    return NextResponse.json({ message: 'Password reset successful for admin user.' });

  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json({ error: 'Server error during password reset' }, { status: 500 });
  }
}