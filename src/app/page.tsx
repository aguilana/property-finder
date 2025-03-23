'use client';

import Link from 'next/link';
import { useUser } from '@clerk/nextjs';

export default function Home() {
  const { isSignedIn } = useUser();

  return (
    <div className="tw-min-h-screen tw-flex tw-flex-col">
      <header className="tw-bg-dark-blue tw-text-white tw-p-6">
        <div className="tw-container tw-mx-auto tw-flex tw-justify-between tw-items-center">
          <div>
            <h1 className="tw-text-3xl tw-font-bold">DMV Property Finder</h1>
            <p className="tw-text-lg">Find your dream home in the DC, Maryland, Virginia area</p>
          </div>
          <div>
            {isSignedIn ? (
              <Link 
                href="/dashboard" 
                className="tw-bg-light-blue tw-text-dark-blue tw-px-4 tw-py-2 tw-rounded hover:tw-bg-pale-yellow tw-transition"
              >
                Dashboard
              </Link>
            ) : (
              <Link 
                href="/login" 
                className="tw-bg-light-blue tw-text-dark-blue tw-px-4 tw-py-2 tw-rounded hover:tw-bg-pale-yellow tw-transition"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="tw-flex-grow tw-container tw-mx-auto tw-p-6">
        <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-8 tw-mb-10">
          <div className="tw-bg-white tw-rounded-lg tw-shadow-md tw-p-6">
            <h2 className="tw-text-2xl tw-font-semibold tw-mb-4">How It Works</h2>
            <ol className="tw-list-decimal tw-pl-5 tw-space-y-2">
              <li>Create a property search with your criteria</li>
              <li>Our system automatically scrapes real estate websites</li>
              <li>Get notified when new properties matching your criteria are found</li>
              <li>Never miss out on your dream home again!</li>
            </ol>
            <div className="tw-mt-6">
              <Link 
                href={isSignedIn ? "/searches/new" : "/login"} 
                className="tw-inline-block tw-bg-forest tw-text-white tw-px-4 tw-py-2 tw-rounded hover:tw-bg-sage tw-transition"
              >
                {isSignedIn ? "Create Your First Search" : "Sign In to Get Started"}
              </Link>
            </div>
          </div>

          <div className="tw-bg-white tw-rounded-lg tw-shadow-md tw-p-6">
            <h2 className="tw-text-2xl tw-font-semibold tw-mb-4">Features</h2>
            <ul className="tw-space-y-2">
              <li className="tw-flex tw-items-start">
                <span className="tw-mr-2 tw-text-green-500">✓</span>
                <span>Search multiple real estate websites at once</span>
              </li>
              <li className="tw-flex tw-items-start">
                <span className="tw-mr-2 tw-text-green-500">✓</span>
                <span>Set custom price ranges, bedrooms, and bathrooms</span>
              </li>
              <li className="tw-flex tw-items-start">
                <span className="tw-mr-2 tw-text-green-500">✓</span>
                <span>Target specific neighborhoods or zip codes</span>
              </li>
              <li className="tw-flex tw-items-start">
                <span className="tw-mr-2 tw-text-green-500">✓</span>
                <span>Get email notifications for new properties</span>
              </li>
              <li className="tw-flex tw-items-start">
                <span className="tw-mr-2 tw-text-green-500">✓</span>
                <span>Track your favorite properties</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="tw-bg-gray-100 tw-rounded-lg tw-p-6 tw-mb-10">
          <h2 className="tw-text-2xl tw-font-semibold tw-mb-4">Areas We Cover</h2>
          <div className="tw-grid tw-grid-cols-2 md:tw-grid-cols-4 tw-gap-4">
            <div className="tw-bg-white tw-p-4 tw-rounded tw-shadow">
              <h3 className="tw-font-semibold">Washington DC</h3>
              <p className="tw-text-sm tw-text-gray-600">All neighborhoods</p>
            </div>
            <div className="tw-bg-white tw-p-4 tw-rounded tw-shadow">
              <h3 className="tw-font-semibold">Northern Virginia</h3>
              <p className="tw-text-sm tw-text-gray-600">Arlington, Alexandria, Fairfax</p>
            </div>
            <div className="tw-bg-white tw-p-4 tw-rounded tw-shadow">
              <h3 className="tw-font-semibold">Maryland</h3>
              <p className="tw-text-sm tw-text-gray-600">Montgomery, Prince George&apos;s</p>
            </div>
            <div className="tw-bg-white tw-p-4 tw-rounded tw-shadow">
              <h3 className="tw-font-semibold">Suburbs</h3>
              <p className="tw-text-sm tw-text-gray-600">Bethesda, Silver Spring, McLean</p>
            </div>
          </div>
        </div>

        <div className="tw-text-center">
          <Link 
            href={isSignedIn ? "/dashboard" : "/login"}
            className="tw-inline-block tw-bg-forest tw-text-white tw-px-6 tw-py-3 tw-rounded-lg tw-text-lg tw-font-semibold hover:tw-bg-sage tw-transition"
          >
            {isSignedIn ? "Go to Dashboard" : "Sign In Now"}
          </Link>
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