import { Property } from '@prisma/client';

export interface ScraperOptions {
  minPrice?: number;
  maxPrice: number;
  minBedrooms: number;
  minBathrooms: number;
  locations: string[];
}

export abstract class BaseScraper {
  protected options: ScraperOptions;
  protected source: string;

  constructor(options: ScraperOptions, source: string) {
    this.options = options;
    this.source = source;
  }

  abstract scrape(): Promise<Property[]>;

  protected isPropertyMatch(property: Partial<Property>): boolean {
    if (!property.price || 
        !property.bedrooms || 
        !property.bathrooms || 
        !property.city || 
        !property.state) {
      return false;
    }

    // Check if property matches our search criteria
    if (this.options.minPrice && property.price < this.options.minPrice) {
      return false;
    }

    if (property.price > this.options.maxPrice) {
      return false;
    }

    if (property.bedrooms < this.options.minBedrooms) {
      return false;
    }

    if (property.bathrooms < this.options.minBathrooms) {
      return false;
    }

    // Check if property is in one of our target locations
    // This could be a city name or a ZIP code
    let matchesLocation = false;
    
    // Check multiple location formats
    const propertyLocation = `${property.city}, ${property.state}`.toLowerCase();
    const propertyLocationWithZip = `${property.city}, ${property.state} ${property.zipCode}`.toLowerCase();
    const zipCodeOnly = property.zipCode?.toLowerCase() || '';
    
    console.log(`Checking if property location "${propertyLocation}" or ZIP "${zipCodeOnly}" matches any of: ${this.options.locations.join(', ')}`);
    
    // Compare against each specified location
    for (const location of this.options.locations) {
      const locationLower = location.toLowerCase();
      
      // Direct ZIP code comparison - highest priority match
      if (locationLower.match(/^\d{5}$/) && zipCodeOnly === locationLower) {
        console.log(`✓ Direct ZIP code match: ${zipCodeOnly} equals ${locationLower}`);
        matchesLocation = true;
        break;
      }
      
      // ZIP code included in property location
      if (locationLower.match(/^\d{5}$/) && propertyLocationWithZip.includes(locationLower)) {
        console.log(`✓ ZIP code found in address: ${propertyLocationWithZip} contains ${locationLower}`);
        matchesLocation = true;
        break;
      }
      
      // City name match (exact or contained)
      const cityNameLower = property.city.toLowerCase();
      if (cityNameLower === locationLower || cityNameLower.includes(locationLower) || locationLower.includes(cityNameLower)) {
        console.log(`✓ City name match: "${cityNameLower}" matches "${locationLower}"`);
        matchesLocation = true;
        break;
      }
      
      // Full location string check
      if (propertyLocation.includes(locationLower) || propertyLocationWithZip.includes(locationLower)) {
        console.log(`✓ Location string match: "${propertyLocation}" contains "${locationLower}"`);
        matchesLocation = true;
        break;
      }
    }
    
    // Log why we're accepting or rejecting this property for debugging
    if (matchesLocation) {
      console.log(`Accepting property: ${property.address}, ${property.city}, ${property.state} ${property.zipCode}`);
    } else {
      console.log(`Rejecting property: ${property.address}, ${property.city}, ${property.state} ${property.zipCode} - Location doesn't match any of: ${this.options.locations.join(', ')}`);
    }

    return matchesLocation;
  }
}