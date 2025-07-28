// app/reset-password/page.tsx
import { Suspense } from 'react';
import ResetPasswordContent from './ResetPasswordContent.tsx/page';

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 font-inter p-4">
            {/* Wrap the client component that uses useSearchParams in Suspense */}
            <Suspense fallback={
                <div className="flex flex-col items-center">
                    <svg className="animate-spin text-indigo-600 h-12 w-12" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-4 text-gray-700">Loading reset form...</p>
                </div>
            }>
                <ResetPasswordContent />
            </Suspense>
        </div>
    );
}
