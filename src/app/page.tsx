// src/app/page.tsx
import { redirect } from 'next/navigation';

export default function HomePage() {
  // Immediately redirect to the /login page
  redirect('/login');
}