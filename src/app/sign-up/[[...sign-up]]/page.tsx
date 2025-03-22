'use client';

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="tw-min-h-screen tw-flex tw-flex-col">
      <header className="tw-bg-accent-dark tw-text-white tw-p-6">
        <div className="tw-container tw-mx-auto">
          <h1 className="tw-text-3xl tw-font-bold">DMV Property Finder</h1>
          <p className="tw-text-lg">Create your account</p>
        </div>
      </header>

      <main className="tw-flex-grow tw-flex tw-items-center tw-justify-center tw-p-6">
        <div className="tw-w-full tw-max-w-md tw-rounded-lg tw-shadow-md tw-p-8 tw-bg-light-blue">
          <SignUp appearance={{
            elements: {
              formButtonPrimary: 'tw-bg-sage hover:tw-bg-forest tw-text-white',
              card: 'tw-bg-light-blue tw-shadow-md',
              headerTitle: 'tw-text-dark-blue',
              headerSubtitle: 'tw-text-forest',
            }
          }} />
          
          <div className="tw-mt-6 tw-text-center">
            <Link href="/" className="tw-text-forest hover:tw-underline tw-text-sm">
              Back to home
            </Link>
          </div>
        </div>
      </main>

      <footer className="tw-bg-dark-blue tw-text-white tw-p-6">
        <div className="tw-container tw-mx-auto tw-text-center">
          <p>© {new Date().getFullYear()} DMV Property Finder | Not affiliated with any real estate website</p>
          <p className="tw-text-sm tw-mt-2">This application is for personal use only.</p>
        </div>
      </footer>
    </div>
  );
}