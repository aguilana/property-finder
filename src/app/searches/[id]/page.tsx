'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useUser } from '@clerk/nextjs';
import { use } from 'react';

interface Search {
  id: string;
  name: string;
  minPrice: number | null;
  maxPrice: number;
  minBedrooms: number;
  minBathrooms: number;
  location: string[];
  notifyOnNew: boolean;
  isActive: boolean;
  createdAt: string;
  lastCheckedAt: string | null;
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

export default function SearchDetail({ params }: { params: { id: string } }) {
  const searchId = use(params).id;
  console.log('Search ID /app/search/[id]:', searchId);
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [search, setSearch] = useState<Search | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Redirect if not authenticated
    if (isLoaded && !isSignedIn) {
      router.push('/login');
      return;
    }

    if (isLoaded && isSignedIn && searchId) {
      console.log('Fetching search details for ID:', {
        isLoaded,
        isSignedIn,
        searchId,
      });
      fetchSearchDetails(searchId);
    }
  }, [isLoaded, isSignedIn, searchId, router]);

  const fetchSearchDetails = async (searchId: string) => {
    console.log('Fetching search details function');
    try {
      setIsLoading(true);
      setError('');
      console.log(`Fetching search details for ID: ${searchId}`);

      const response = await fetch(`/api/searches/${searchId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      console.log('Response from searches:', response);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (response.status === 404) {
          throw new Error(errorData?.error || 'Search not found');
        }
        throw new Error(errorData?.error || 'Failed to fetch search details');
      }

      const data = await response.json();

      if (!data || !data.search) {
        throw new Error('Invalid response data');
      }

      setSearch(data.search);
      setProperties(data.properties || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching search details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunScraper = async () => {
    console.log('Running scraper for search:', search);
    if (!search) return;

    console.log('there is a search');

    try {
      console.log(`Running scraper for search ID: ${search.id}`);

      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ searchId: search.id }),
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to run scraper');
      }

      // Show some indication of success
      alert('Scraper started successfully! Check back soon for results.');

      // Refresh properties after a short delay to give scraper time to find something
      setTimeout(() => {
        fetchSearchDetails(searchId);
      }, 3000);
    } catch (err) {
      alert('Error running scraper. Please try again.');
      console.error('Error running scraper:', err);
    }
  };

  if (!isLoaded || isLoading) {
    return (
      <div className='tw-min-h-screen tw-flex tw-flex-col tw-items-center tw-justify-center'>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='tw-min-h-screen tw-flex tw-flex-col tw-items-center tw-justify-center'>
        <div className='tw-bg-red-100 tw-border tw-border-red-400 tw-text-red-700 tw-px-6 tw-py-4 tw-rounded'>
          <p className='tw-text-lg'>{error}</p>
          <Link
            href='/dashboard'
            className='tw-text-blue-600 hover:tw-underline tw-mt-2 tw-inline-block'
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!search) {
    return (
      <div className='tw-min-h-screen tw-flex tw-flex-col tw-items-center tw-justify-center'>
        <div className='tw-text-center'>
          <p className='tw-text-lg tw-text-gray-600'>Search not found</p>
          <Link
            href='/dashboard'
            className='tw-text-blue-600 hover:tw-underline tw-mt-2 tw-inline-block'
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className='tw-min-h-screen tw-flex tw-flex-col'>
      <header className='tw-bg-forest tw-text-white tw-p-6'>
        <div className='tw-container tw-mx-auto tw-flex tw-justify-between tw-items-center'>
          <div>
            <h1 className='tw-text-3xl tw-font-bold'>DMV Property Finder</h1>
            <p className='tw-text-lg'>Search Details</p>
          </div>
          <div>
            <Link
              href='/dashboard'
              className='tw-bg-light-blue tw-text-dark-blue tw-px-4 tw-py-2 tw-rounded hover:tw-bg-pale-yellow tw-transition'
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className='tw-flex-grow tw-container tw-mx-auto tw-p-6'>
        <div className='tw-bg-white tw-rounded-lg tw-shadow-md tw-mb-8'>
          <div className='tw-p-6 tw-border-b tw-border-gray-200 tw-flex tw-justify-between tw-items-center'>
            <h2 className='tw-text-2xl tw-font-semibold'>{search.name}</h2>
            <div>
              <button
                onClick={handleRunScraper}
                className='tw-bg-blue-600 tw-text-white tw-px-4 tw-py-2 tw-rounded hover:tw-bg-blue-700 tw-transition tw-mr-2'
              >
                Run Scraper Now
              </button>
              <Link
                href={`/searches/${search.id}/edit`}
                className='tw-bg-gray-200 tw-text-gray-800 tw-px-4 tw-py-2 tw-rounded hover:tw-bg-gray-300 tw-transition'
              >
                Edit Search
              </Link>
            </div>
          </div>

          <div className='tw-p-6 tw-grid tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-4 tw-gap-6'>
            <div className='tw-border tw-border-gray-200 tw-rounded-lg tw-p-4'>
              <h3 className='tw-text-gray-500 tw-text-sm tw-uppercase'>
                Location
              </h3>
              <p className='tw-font-medium tw-text-lg'>
                {search.location.join(', ')}
              </p>
            </div>

            <div className='tw-border tw-border-gray-200 tw-rounded-lg tw-p-4'>
              <h3 className='tw-text-gray-500 tw-text-sm tw-uppercase'>
                Price Range
              </h3>
              <p className='tw-font-medium tw-text-lg'>
                {search.minPrice
                  ? `$${search.minPrice.toLocaleString()} - $${search.maxPrice.toLocaleString()}`
                  : `Up to $${search.maxPrice.toLocaleString()}`}
              </p>
            </div>

            <div className='tw-border tw-border-gray-200 tw-rounded-lg tw-p-4'>
              <h3 className='tw-text-gray-500 tw-text-sm tw-uppercase'>
                Requirements
              </h3>
              <p className='tw-font-medium tw-text-lg'>
                {search.minBedrooms}+ beds, {search.minBathrooms}+ baths
              </p>
            </div>

            <div className='tw-border tw-border-gray-200 tw-rounded-lg tw-p-4'>
              <h3 className='tw-text-gray-500 tw-text-sm tw-uppercase'>
                Last Checked
              </h3>
              <p className='tw-font-medium tw-text-lg'>
                {search.lastCheckedAt
                  ? new Date(search.lastCheckedAt).toLocaleString()
                  : 'Never'}
              </p>
            </div>
          </div>
        </div>

        <div className='tw-bg-white tw-rounded-lg tw-shadow-md'>
          <div className='tw-p-6 tw-border-b tw-border-gray-200 tw-flex tw-justify-between tw-items-center'>
            <h2 className='tw-text-2xl tw-font-semibold'>
              Properties Found ({properties.length})
            </h2>
            <div className='tw-text-gray-500'>
              Showing all properties matching your search criteria
            </div>
          </div>

          <div className='tw-p-6'>
            {properties.length === 0 ? (
              <div className='tw-text-center tw-py-8'>
                <p className='tw-text-gray-500'>No properties found yet.</p>
                <p className='tw-text-gray-500 tw-mt-2'>
                  Run the scraper to find properties matching your criteria.
                </p>
                <button
                  onClick={handleRunScraper}
                  className='tw-mt-4 tw-bg-blue-600 tw-text-white tw-px-4 tw-py-2 tw-rounded hover:tw-bg-blue-700 tw-transition'
                >
                  Run Scraper Now
                </button>
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
                      <p className='tw-text-gray-500 tw-text-xs tw-mt-2'>
                        Found on{' '}
                        {new Date(property.createdAt).toLocaleDateString()}
                      </p>
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
