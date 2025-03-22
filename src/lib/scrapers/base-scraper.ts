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
    const propertyLocation = `${property.city}, ${property.state}`.toLowerCase();
    const matchesLocation = this.options.locations.some(location => {
      return propertyLocation.includes(location.toLowerCase());
    });

    return matchesLocation;
  }
}