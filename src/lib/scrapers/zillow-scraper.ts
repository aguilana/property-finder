import { Property } from '@prisma/client';
import { BaseScraper, ScraperOptions } from './base-scraper';
import puppeteer from 'puppeteer';

export class ZillowScraper extends BaseScraper {
  constructor(options: ScraperOptions) {
    super(options, 'zillow');
  }

  async scrape(): Promise<Property[]> {
    const browser = await puppeteer.launch({
      headless: 'new',
    });
    
    try {
      const page = await browser.newPage();
      
      // Set user agent to avoid being blocked
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      const properties: Partial<Property>[] = [];

      // Scrape each location
      for (const location of this.options.locations) {
        // Create search URL with filters
        const encodedLocation = encodeURIComponent(location);
        const minPrice = this.options.minPrice ? `&price=${this.options.minPrice}-${this.options.maxPrice}` : `&price=0-${this.options.maxPrice}`;
        const beds = `&beds=${this.options.minBedrooms}-`;
        const baths = `&baths=${this.options.minBathrooms}-`;
        
        const url = `https://www.zillow.com/homes/${encodedLocation}_rb/${minPrice}${beds}${baths}/`;
        
        console.log(`Scraping: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2' });
        
        // Wait for property cards to load
        await page.waitForSelector('[data-test="property-card"]', { timeout: 10000 })
          .catch(() => console.log('No property cards found or timeout'));
        
        // Extract property data
        const propertyData = await page.evaluate(() => {
          const items = Array.from(document.querySelectorAll('[data-test="property-card"]'));
          return items.map(item => {
            // Extract price
            const priceElement = item.querySelector('[data-test="property-card-price"]');
            const price = priceElement ? priceElement.textContent : null;
            
            // Extract address
            const addressElement = item.querySelector('[data-test="property-card-addr"]');
            const fullAddress = addressElement ? addressElement.textContent : null;
            
            // Extract details (beds, baths, sqft)
            const detailsElement = item.querySelector('[data-test="property-card-details"]');
            const details = detailsElement ? detailsElement.textContent : null;
            
            // Extract link
            const linkElement = item.querySelector('a[data-test="property-card-link"]');
            const link = linkElement ? linkElement.getAttribute('href') : null;

            // Extract image
            const imgElement = item.querySelector('img');
            const imageUrl = imgElement ? imgElement.getAttribute('src') : null;

            return { price, fullAddress, details, link, imageUrl };
          });
        });

        // Process and transform the scraped data
        for (const item of propertyData) {
          if (!item.price || !item.fullAddress || !item.details || !item.link) {
            continue;
          }

          // Parse price
          const priceValue = parseFloat(item.price.replace(/[^0-9.]/g, ''));
          
          // Parse address
          const addressParts = item.fullAddress.split(',');
          const address = addressParts[0]?.trim() || '';
          const cityState = addressParts[1]?.trim().split(' ') || [];
          const city = cityState.slice(0, -1).join(' ') || '';
          const stateZip = cityState[cityState.length - 1]?.split(' ') || [];
          const state = stateZip[0] || '';
          const zipCode = stateZip[1] || '';
          
          // Parse details
          const detailsText = item.details;
          const bedMatch = detailsText.match(/(\d+)\s*bd/);
          const bathMatch = detailsText.match(/(\d+(\.\d+)?)\s*ba/);
          const sqftMatch = detailsText.match(/(\d+,?\d*)\s*sqft/);
          
          const bedrooms = bedMatch ? parseInt(bedMatch[1], 10) : 0;
          const bathrooms = bathMatch ? parseFloat(bathMatch[1]) : 0;
          const squareFeet = sqftMatch ? parseInt(sqftMatch[1].replace(',', ''), 10) : null;
          
          // Create URL (handle relative URLs)
          const url = item.link.startsWith('http') ? item.link : `https://www.zillow.com${item.link}`;
          
          const property: Partial<Property> = {
            address,
            city,
            state,
            zipCode,
            price: priceValue,
            bedrooms,
            bathrooms,
            squareFeet,
            propertyType: 'Unknown', // Would need additional scraping to determine
            url,
            imageUrl: item.imageUrl,
            source: this.source,
          };
          
          // Check if this property matches our criteria
          if (this.isPropertyMatch(property)) {
            properties.push(property);
          }
        }
      }

      // Convert partial properties to full property objects
      return properties as Property[];
      
    } finally {
      await browser.close();
    }
  }
}