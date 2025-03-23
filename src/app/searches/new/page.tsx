'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';

export default function NewSearch() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [formData, setFormData] = useState({
    name: '',
    minPrice: '',
    maxPrice: '',
    minBedrooms: '2',
    minBathrooms: '1',
    location: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Redirect if not authenticated
  if (isLoaded && !isSignedIn) {
    router.push('/login');
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Prepare data for API
      const location = formData.location.split(',').map(loc => loc.trim());
      
      const searchData = {
        name: formData.name,
        minPrice: formData.minPrice ? parseFloat(formData.minPrice) : null,
        maxPrice: parseFloat(formData.maxPrice),
        minBedrooms: parseInt(formData.minBedrooms),
        minBathrooms: parseFloat(formData.minBathrooms),
        location,
        notifyOnNew: true
      };

      // Make API call
      const response = await fetch('/api/searches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create search');
      }

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="tw-min-h-screen tw-flex tw-flex-col tw-items-center tw-justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="tw-min-h-screen tw-flex tw-flex-col">
      <header className="tw-bg-forest tw-text-white tw-p-6">
        <div className="tw-container tw-mx-auto tw-flex tw-justify-between tw-items-center">
          <div>
            <h1 className="tw-text-3xl tw-font-bold">DMV Property Finder</h1>
            <p className="tw-text-lg">Create New Search</p>
          </div>
          <div>
            <Link href="/dashboard" className="tw-bg-light-blue tw-text-dark-blue tw-px-4 tw-py-2 tw-rounded hover:tw-bg-pale-yellow tw-transition tw-mr-2">
              Dashboard
            </Link>
            <Link href="/" className="tw-bg-transparent tw-text-white tw-border tw-border-white tw-px-4 tw-py-2 tw-rounded hover:tw-bg-white/10 tw-transition">
              Home
            </Link>
          </div>
        </div>
      </header>

      <main className="tw-flex-grow tw-container tw-mx-auto tw-p-6">
        <div className="tw-max-w-2xl tw-mx-auto tw-bg-white tw-rounded-lg tw-shadow-md tw-p-6">
          <h2 className="tw-text-2xl tw-font-semibold tw-mb-6">Create New Property Search</h2>
          
          {error && (
            <div className="tw-bg-red-100 tw-border tw-border-red-400 tw-text-red-700 tw-px-4 tw-py-3 tw-rounded tw-mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="tw-mb-4">
              <label htmlFor="name" className="tw-block tw-text-gray-700 tw-font-medium tw-mb-1">Search Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., My Dream Home Search"
                required
                className="tw-w-full tw-border tw-border-gray-300 tw-rounded tw-px-3 tw-py-2 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-blue-500"
              />
            </div>
            
            <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-4 tw-mb-4">
              <div>
                <label htmlFor="minPrice" className="tw-block tw-text-gray-700 tw-font-medium tw-mb-1">Minimum Price (Optional)</label>
                <input
                  type="number"
                  id="minPrice"
                  name="minPrice"
                  value={formData.minPrice}
                  onChange={handleChange}
                  placeholder="e.g., 300000"
                  className="tw-w-full tw-border tw-border-gray-300 tw-rounded tw-px-3 tw-py-2 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="maxPrice" className="tw-block tw-text-gray-700 tw-font-medium tw-mb-1">Maximum Price</label>
                <input
                  type="number"
                  id="maxPrice"
                  name="maxPrice"
                  value={formData.maxPrice}
                  onChange={handleChange}
                  placeholder="e.g., 600000"
                  required
                  className="tw-w-full tw-border tw-border-gray-300 tw-rounded tw-px-3 tw-py-2 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-blue-500"
                />
              </div>
            </div>
            
            <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-4 tw-mb-4">
              <div>
                <label htmlFor="minBedrooms" className="tw-block tw-text-gray-700 tw-font-medium tw-mb-1">Minimum Bedrooms</label>
                <select
                  id="minBedrooms"
                  name="minBedrooms"
                  value={formData.minBedrooms}
                  onChange={handleChange}
                  required
                  className="tw-w-full tw-border tw-border-gray-300 tw-rounded tw-px-3 tw-py-2 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-blue-500"
                >
                  <option value="1">1+</option>
                  <option value="2">2+</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                  <option value="5">5+</option>
                </select>
              </div>
              <div>
                <label htmlFor="minBathrooms" className="tw-block tw-text-gray-700 tw-font-medium tw-mb-1">Minimum Bathrooms</label>
                <select
                  id="minBathrooms"
                  name="minBathrooms"
                  value={formData.minBathrooms}
                  onChange={handleChange}
                  required
                  className="tw-w-full tw-border tw-border-gray-300 tw-rounded tw-px-3 tw-py-2 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-blue-500"
                >
                  <option value="1">1+</option>
                  <option value="1.5">1.5+</option>
                  <option value="2">2+</option>
                  <option value="2.5">2.5+</option>
                  <option value="3">3+</option>
                  <option value="3.5">3.5+</option>
                </select>
              </div>
            </div>
            
            <div className="tw-mb-6">
              <label htmlFor="location" className="tw-block tw-text-gray-700 tw-font-medium tw-mb-1">Locations (comma separated)</label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g., Arlington VA, Alexandria VA, Washington DC"
                required
                className="tw-w-full tw-border tw-border-gray-300 tw-rounded tw-px-3 tw-py-2 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-blue-500"
              />
              <p className="tw-text-gray-500 tw-text-sm tw-mt-1">Enter city/state combinations or zip codes, separated by commas</p>
            </div>
            
            <div className="tw-flex tw-justify-end">
              <Link href="/dashboard" className="tw-bg-gray-300 tw-text-gray-800 tw-px-4 tw-py-2 tw-rounded hover:tw-bg-gray-400 tw-transition tw-mr-3">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="tw-bg-forest tw-text-white tw-px-4 tw-py-2 tw-rounded hover:tw-bg-sage tw-transition tw-flex tw-items-center"
              >
                {isSubmitting ? (
                  <>
                    <svg className="tw-animate-spin tw-mr-2 tw-h-4 tw-w-4 tw-text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="tw-opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="tw-opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : 'Create Search'}
              </button>
            </div>
          </form>
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