'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { UserButton, useUser } from '@clerk/nextjs';

interface Search {
  id: string;
  name: string;
  createdAt: string;
  lastCheckedAt: string | null;
  location?: string[];
  isActive: boolean;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  minBathrooms?: number;
}

interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  url: string;
  imageUrl: string | null;
  createdAt: string;
}

export default function Dashboard() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const [searches, setSearches] = useState<Search[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Redirect if not authenticated
    if (isLoaded && !isSignedIn) {
      router.push('/login');
      return;
    }

    if (isLoaded && isSignedIn) {
      fetchSearches();
      fetchRecentProperties();
    }
  }, [isLoaded, isSignedIn, router]);

  const fetchSearches = async () => {
    try {
      const response = await fetch('/api/searches');
      if (!response.ok) {
        throw new Error('Failed to fetch searches');
      }
      const data = await response.json();
      setSearches(data);
    } catch (err) {
      setError('Error loading searches');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecentProperties = async () => {
    try {
      const response = await fetch('/api/properties?limit=10');
      if (!response.ok) {
        throw new Error('Failed to fetch properties');
      }
      const data = await response.json();
      setProperties(data.properties || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunScraper = async (searchId: string) => {
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ searchId }),
      });

      if (!response.ok) {
        throw new Error('Failed to run scraper');
      }

      // Show some indication of success
      alert('Scraper started successfully! Check back soon for results.');
    } catch (err) {
      alert('Error running scraper. Please try again.');
      console.error(err);
    }
  };

  if (!isLoaded || isLoading) {
    return (
      <div className='tw-min-h-screen tw-flex tw-flex-col tw-items-center tw-justify-center'>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className='tw-min-h-screen tw-flex tw-flex-col'>
      <header className='tw-bg-forest tw-text-white tw-p-6'>
        <div className='tw-container tw-mx-auto tw-flex tw-justify-between tw-items-center'>
          <div>
            <h1 className='tw-text-3xl tw-font-bold'>DMV Property Finder</h1>
            <p className='tw-text-lg'>Dashboard</p>
          </div>
          <div className='tw-flex tw-items-center'>
            <span className='tw-text-white tw-mr-4'>
              {user?.firstName || user?.emailAddresses[0]?.emailAddress}
            </span>
            <UserButton afterSignOutUrl='/' />
          </div>
        </div>
      </header>

      <main className='tw-flex-grow tw-container tw-mx-auto tw-p-6'>
        <div className='tw-grid tw-grid-cols-1 md:tw-grid-cols-3 tw-gap-6 tw-mb-8'>
          <div className='tw-bg-white tw-rounded-lg tw-shadow-md tw-p-6 tw-border-l-4 tw-border-blue-500'>
            <h3 className='tw-text-lg tw-font-semibold'>Active Searches</h3>
            <p className='tw-text-3xl tw-font-bold'>
              {searches.filter((s) => s.isActive).length}
            </p>
          </div>
          <div className='tw-bg-white tw-rounded-lg tw-shadow-md tw-p-6 tw-border-l-4 tw-border-green-500'>
            <h3 className='tw-text-lg tw-font-semibold'>Properties Found</h3>
            <p className='tw-text-3xl tw-font-bold'>{properties.length}</p>
          </div>
          <div className='tw-bg-white tw-rounded-lg tw-shadow-md tw-p-6 tw-border-l-4 tw-border-yellow-500'>
            <h3 className='tw-text-lg tw-font-semibold'>Last Update</h3>
            <p className='tw-text-xl tw-font-bold'>
              {searches.length > 0 && searches.some((s) => s.lastCheckedAt)
                ? new Date(
                    Math.max(
                      ...searches
                        .filter((s) => s.lastCheckedAt)
                        .map((s) => new Date(s.lastCheckedAt!).getTime())
                    )
                  ).toLocaleString()
                : 'Never'}
            </p>
          </div>
        </div>

        <div className='tw-bg-white tw-rounded-lg tw-shadow-md tw-mb-8'>
          <div className='tw-p-6 tw-border-b tw-border-gray-200 tw-flex tw-justify-between tw-items-center'>
            <h2 className='tw-text-2xl tw-font-semibold'>
              Your Property Searches
            </h2>
            <Link
              href='/searches/new'
              className='tw-bg-blue-600 tw-text-white tw-px-4 tw-py-2 tw-rounded hover:tw-bg-blue-700 tw-transition'
            >
              Create New Search
            </Link>
          </div>
          <div className='tw-p-6'>
            {error && (
              <div className='tw-bg-red-100 tw-border tw-border-red-400 tw-text-red-700 tw-px-4 tw-py-3 tw-rounded tw-mb-4'>
                {error}
              </div>
            )}

            {searches.length === 0 ? (
              <div className='tw-text-center tw-py-8'>
                <p className='tw-text-gray-500 tw-mb-4'>
                  You don&apos;t have any property searches yet.
                </p>
                <Link
                  href='/searches/new'
                  className='tw-text-blue-600 hover:tw-underline'
                >
                  Create your first search
                </Link>
              </div>
            ) : (
              <div className='tw-overflow-x-auto'>
                <table className='tw-min-w-full tw-border-collapse'>
                  <thead>
                    <tr className='tw-bg-gray-50'>
                      <th className='tw-py-3 tw-px-4 tw-text-left tw-font-semibold tw-text-gray-600'>
                        Name
                      </th>
                      <th className='tw-py-3 tw-px-4 tw-text-left tw-font-semibold tw-text-gray-600'>
                        Location
                      </th>
                      <th className='tw-py-3 tw-px-4 tw-text-left tw-font-semibold tw-text-gray-600'>
                        Price Range
                      </th>
                      <th className='tw-py-3 tw-px-4 tw-text-left tw-font-semibold tw-text-gray-600'>
                        Beds/Baths
                      </th>
                      <th className='tw-py-3 tw-px-4 tw-text-left tw-font-semibold tw-text-gray-600'>
                        Last Checked
                      </th>
                      <th className='tw-py-3 tw-px-4 tw-text-left tw-font-semibold tw-text-gray-600'>
                        Status
                      </th>
                      <th className='tw-py-3 tw-px-4 tw-text-right tw-font-semibold tw-text-gray-600'>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {searches.map((search) => (
                      <tr
                        key={search.id}
                        className='tw-border-t tw-border-gray-200'
                      >
                        <td className='tw-py-3 tw-px-4 tw-font-medium'>
                          <Link
                            href={`/searches/${search.id}`}
                            className='tw-text-blue-600 hover:tw-underline'
                          >
                            {search.name}
                          </Link>
                        </td>
                        <td className='tw-py-3 tw-px-4 tw-text-gray-600'>
                          {search.location && Array.isArray(search.location)
                            ? search.location.join(', ')
                            : 'N/A'}
                        </td>
                        <td className='tw-py-3 tw-px-4 tw-text-gray-600'>
                          {search.minPrice
                            ? `$${search.minPrice.toLocaleString()} - $${
                                search.maxPrice?.toLocaleString() || 'N/A'
                              }`
                            : search.maxPrice !== undefined
                            ? `Up to $${search.maxPrice.toLocaleString()}`
                            : 'N/A'}
                        </td>
                        <td className='tw-py-3 tw-px-4 tw-text-gray-600'>
                          {search.minBedrooms}+ bd / {search.minBathrooms}+ ba
                        </td>
                        <td className='tw-py-3 tw-px-4 tw-text-gray-600'>
                          {search.lastCheckedAt
                            ? new Date(search.lastCheckedAt).toLocaleString()
                            : 'Never'}
                        </td>
                        <td className='tw-py-3 tw-px-4'>
                          <span
                            className={`tw-inline-block tw-px-2 tw-py-1 tw-rounded-full tw-text-xs tw-font-semibold ${
                              search.isActive
                                ? 'tw-bg-green-100 tw-text-green-800'
                                : 'tw-bg-gray-100 tw-text-gray-800'
                            }`}
                          >
                            {search.isActive ? 'Active' : 'Paused'}
                          </span>
                        </td>
                        <td className='tw-py-3 tw-px-4 tw-text-right'>
                          <button
                            onClick={() => handleRunScraper(search.id)}
                            className='tw-bg-blue-600 tw-text-white tw-px-3 tw-py-1 tw-rounded hover:tw-bg-blue-700 tw-mr-2 tw-text-sm'
                          >
                            Run Now
                          </button>
                          <Link
                            href={`/searches/${search.id}/edit`}
                            className='tw-bg-gray-200 tw-text-gray-800 tw-px-3 tw-py-1 tw-rounded hover:tw-bg-gray-300 tw-text-sm'
                          >
                            Edit
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className='tw-bg-white tw-rounded-lg tw-shadow-md'>
          <div className='tw-p-6 tw-border-b tw-border-gray-200'>
            <h2 className='tw-text-2xl tw-font-semibold'>
              Recently Found Properties
            </h2>
          </div>
          <div className='tw-p-6'>
            {properties.length === 0 ? (
              <div className='tw-text-center tw-py-8'>
                <p className='tw-text-gray-500'>No properties found yet.</p>
                <p className='tw-text-gray-500 tw-mt-2'>
                  Create a search to start finding properties in the DMV area.
                </p>
              </div>
            ) : (
              <div className='tw-grid tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-6'>
                {properties.map((property) => (
                  <div
                    key={property.id}
                    className='tw-border tw-border-gray-200 tw-rounded-lg tw-overflow-hidden'
                  >
                    <div className='tw-relative tw-pb-[60%] tw-bg-gray-100'>
                      {property.imageUrl ? (
                        <img
                          src={property.imageUrl}
                          alt={property.address}
                          className='tw-absolute tw-w-full tw-h-full tw-object-cover'
                        />
                      ) : (
                        <div className='tw-absolute tw-w-full tw-h-full tw-flex tw-items-center tw-justify-center tw-text-gray-400'>
                          No Image
                        </div>
                      )}
                      <div className='tw-absolute tw-bottom-0 tw-left-0 tw-right-0 tw-bg-gradient-to-t tw-from-black/70 tw-to-transparent tw-p-4'>
                        <p className='tw-text-white tw-font-bold tw-text-xl'>
                          ${property.price.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className='tw-p-4'>
                      <h3 className='tw-font-semibold tw-mb-1 tw-line-clamp-1'>
                        {property.address}
                      </h3>
                      <p className='tw-text-gray-600 tw-text-sm tw-mb-2'>
                        {property.city}, {property.state}
                      </p>
                      <p className='tw-mb-3'>
                        <span className='tw-font-medium'>
                          {property.bedrooms}
                        </span>{' '}
                        bd |
                        <span className='tw-font-medium tw-ml-1'>
                          {property.bathrooms}
                        </span>{' '}
                        ba
                      </p>
                      <a
                        href={property.url}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='tw-block tw-text-center tw-bg-blue-600 tw-text-white tw-py-2 tw-rounded tw-w-full hover:tw-bg-blue-700 tw-transition'
                      >
                        View Property
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className='tw-bg-dark-blue tw-text-white tw-p-6'>
        <div className='tw-container tw-mx-auto tw-text-center'>
          <p>
            © {new Date().getFullYear()} DMV Property Finder | Not affiliated
            with any real estate website
          </p>
          <p className='tw-text-sm tw-mt-2'>
            This application is for personal use only.
          </p>
        </div>
      </footer>
    </div>
  );
}
