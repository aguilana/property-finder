import { Property } from '@prisma/client';
import { BaseScraper, ScraperOptions } from './base-scraper';
import puppeteer from 'puppeteer';

export class ZillowScraper extends BaseScraper {
  constructor(options: ScraperOptions) {
    super(options, 'zillow');
  }

  async scrape(): Promise<Property[]> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();

      // Set user agent to avoid being blocked
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      const properties: Partial<Property>[] = [];

      // Scrape each location
      for (const location of this.options.locations) {
        // Create search URL with filters - updated format based on Zillow URL patterns
        const encodedLocation = encodeURIComponent(location);

        // Construct a more modern Zillow URL format
        let url = `https://www.zillow.com/homes/${encodedLocation}/`;

        // Add price filter
        if (this.options.minPrice) {
          url += `${this.options.minPrice}-${this.options.maxPrice}_price/`;
        } else {
          url += `0-${this.options.maxPrice}_price/`;
        }

        // Add beds filter
        url += `${this.options.minBedrooms}-_beds/`;

        // Add baths filter
        url += `${this.options.minBathrooms}-_baths/`;

        console.log(`Scraping: ${url}`);

        // Set longer timeout
        await page.setDefaultNavigationTimeout(60000); // 60 seconds

        try {
          await page.goto(url, { waitUntil: 'networkidle2' });

          // Wait for property cards to load - use article tag with data-test attribute
          console.log('Waiting for property cards to load...');
          await page
            .waitForSelector('article[data-test="property-card"]', {
              timeout: 30000,
            })
            .catch(() => {
              console.log(
                'No property cards found or timeout using primary selector'
              );
              return page
                .waitForSelector('[data-test="property-card"]', {
                  timeout: 10000,
                })
                .catch(() =>
                  console.log('No property cards found with any selector')
                );
            });

          // Take screenshot for debugging
          await page.screenshot({ path: 'zillow-page.png', fullPage: true });
          console.log('Page screenshot saved to zillow-page.png');

          // Extract property data with improved selectors based on the full HTML list structure
          const propertyData = await page.evaluate(() => {
            // First try to find the list of properties
            const listSelectors = [
              'ul.photo-cards',
              '.List-c11n-8-109-3__sc-1smrmqp-0',
              '.StyledSearchListWrapper-srp-8-109-3__sc-1ieen0c-0'
            ];
            
            let propertyList = null;
            for (const selector of listSelectors) {
              const list = document.querySelector(selector);
              if (list) {
                console.log(`Found property list with selector: ${selector}`);
                propertyList = list;
                break;
              }
            }
            
            // Find property cards - either by getting list items or direct article elements
            let items = [];
            
            // Option 1: Find through list items
            if (propertyList) {
              const listItems = propertyList.querySelectorAll('li');
              console.log(`Found ${listItems.length} list items in property list`);
              
              // Each list item should contain a property card
              items = Array.from(listItems).map(li => {
                // Find the article inside the list item
                return li.querySelector('article[data-test="property-card"]') || li;
              }).filter(item => item != null);
              
              if (items.length > 0) {
                console.log(`Found ${items.length} property cards inside list items`);
              }
            }
            
            // Option 2: If no items found via list, try direct article selectors
            if (items.length === 0) {
              const cardSelectors = [
                'article[data-test="property-card"]',
                '[data-test="property-card"]',
                '.property-card',
                '.list-card'
              ];
              
              for (const selector of cardSelectors) {
                items = Array.from(document.querySelectorAll(selector));
                if (items.length > 0) {
                  console.log(`Found ${items.length} items with direct selector: ${selector}`);
                  break;
                }
              }
            }
            
            console.log(`Processing ${items.length} property items`);
            return items.map((item) => {
              // Price - try multiple selectors
              const priceSelectors = [
                '[data-test="property-card-price"]',
                '.PropertyCardWrapper__StyledPriceLine-srp-8-109-3__sc-16e8gqd-1',
                'span[data-test="property-card-price"]',
              ];

              let price = null;
              for (const selector of priceSelectors) {
                const el = item.querySelector(selector);
                if (el && el.textContent) {
                  price = el.textContent.trim();
                  break;
                }
              }

              // Address - try multiple selectors including the exact tag from the example
              const addressSelectors = [
                'address',
                '[data-test="property-card-addr"]',
                'a[data-test="property-card-link"] address',
              ];

              let fullAddress = null;
              for (const selector of addressSelectors) {
                const el = item.querySelector(selector);
                if (el && el.textContent) {
                  fullAddress = el.textContent.trim();
                  break;
                }
              }

              // Details (beds, baths, sqft) - use the list items from the example
              let beds = null;
              let baths = null;
              let sqft = null;

              // Try to find details in list items
              const listItems = Array.from(item.querySelectorAll('ul li'));
              listItems.forEach((li) => {
                const text = li.textContent?.trim();
                if (!text) return;

                if (text.includes('bd')) {
                  const match = text.match(/(\d+).*bd/);
                  if (match) beds = match[1];
                } else if (text.includes('ba')) {
                  const match = text.match(/(\d+(?:\.\d+)?).*ba/);
                  if (match) baths = match[1];
                } else if (text.includes('sqft')) {
                  const match = text.match(/(\d+,?\d*).*sqft/);
                  if (match) sqft = match[1].replace(',', '');
                }
              });

              // If list items didn't work, try the old selector as fallback
              if (!beds || !baths) {
                const detailsElement = item.querySelector(
                  '[data-test="property-card-details"]'
                );
                if (detailsElement) {
                  const details = detailsElement.textContent;
                  if (details) {
                    if (!beds) {
                      const bedMatch = details.match(/(\d+)\s*bd/);
                      beds = bedMatch ? bedMatch[1] : null;
                    }

                    if (!baths) {
                      const bathMatch = details.match(/(\d+(?:\.\d+)?)\s*ba/);
                      baths = bathMatch ? bathMatch[1] : null;
                    }

                    if (!sqft) {
                      const sqftMatch = details.match(/(\d+,?\d*)\s*sqft/);
                      sqft = sqftMatch ? sqftMatch[1].replace(',', '') : null;
                    }
                  }
                }
              }

              // Combine the details into a single string for the old processing code
              const details = [
                beds ? `${beds} bd` : '',
                baths ? `${baths} ba` : '',
                sqft ? `${sqft} sqft` : '',
              ]
                .filter((d) => d)
                .join(', ');

              // Extract link - preferring href with homedetails as in the example
              let link = null;
              const linkSelectors = [
                'a[href*="/homedetails/"]',
                'a[data-test="property-card-link"]',
                'a.property-card-link',
              ];

              for (const selector of linkSelectors) {
                const el = item.querySelector(selector);
                if (el && el.getAttribute('href')) {
                  link = el.getAttribute('href');
                  break;
                }
              }

              // Extract image
              let imageUrl = null;
              const imgSelectors = [
                'picture img',
                'img',
                '[data-test="property-image"]',
              ];

              for (const selector of imgSelectors) {
                const el = item.querySelector(selector);
                if (el) {
                  // Try src first, then data-src as fallback
                  imageUrl =
                    el.getAttribute('src') || el.getAttribute('data-src');
                  if (imageUrl) break;
                }
              }

              return {
                price,
                fullAddress,
                beds,
                baths,
                sqft,
                details, // Keep for backward compatibility
                link,
                imageUrl,
              };
            });
          });

          // Process and transform the scraped data
          for (const item of propertyData) {
            // Skip incomplete data
            if (!item.price || !item.fullAddress || !item.link) {
              console.log('Skipping property with missing data:', item);
              continue;
            }

            // Parse price - remove $ and commas
            const priceValue = parseFloat(item.price.replace(/[^0-9.]/g, ''));

            // Parse address into components
            const addressParts = item.fullAddress.split(',');
            const address = addressParts[0]?.trim() || '';

            let city = '';
            let state = '';
            let zipCode = '';

            // Handle case where we have "City, ST ZIPCODE" format
            if (addressParts.length > 1) {
              const cityStatePart = addressParts[1].trim();

              // Match the state and zip using regex - most US states are 2 capital letters
              const stateZipMatch = cityStatePart.match(
                /\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\s*$/
              );

              if (stateZipMatch) {
                state = stateZipMatch[1];
                zipCode = stateZipMatch[2];

                // Remove state and zip from city part
                city = cityStatePart.replace(stateZipMatch[0], '').trim();
              } else {
                // Fallback to old parsing method
                const cityStateParts = cityStatePart.split(' ');

                // Last token might be ZIP code
                const lastToken = cityStateParts[cityStateParts.length - 1];
                if (/^\d{5}(?:-\d{4})?$/.test(lastToken)) {
                  zipCode = lastToken;
                  cityStateParts.pop();
                }

                // Second to last token is likely the state
                if (cityStateParts.length > 0) {
                  state = cityStateParts.pop() || '';
                }

                // The rest is the city
                city = cityStateParts.join(' ');
              }
            }

            console.log(
              `Parsed address: ${address}, City: ${city}, State: ${state}, ZIP: ${zipCode}`
            );

            // Parse details - use pre-parsed values from our new scraper
            const bedrooms = item.beds ? parseInt(item.beds, 10) : 0;
            const bathrooms = item.baths ? parseFloat(item.baths) : 0;
            const squareFeet = item.sqft ? parseInt(item.sqft, 10) : null;

            console.log(
              `Parsed details: ${bedrooms} beds, ${bathrooms} baths, ${squareFeet} sqft`
            );

            // Create URL (handle relative URLs)
            const url = item.link.startsWith('http')
              ? item.link
              : `https://www.zillow.com${item.link}`;

            // Determine property type if possible
            let propertyType = 'Unknown';
            // Check if we can determine property type from any available data
            if (item.details && item.details.toLowerCase().includes('house')) {
              propertyType = 'House';
            } else if (
              item.details &&
              item.details.toLowerCase().includes('condo')
            ) {
              propertyType = 'Condo';
            } else if (
              item.details &&
              item.details.toLowerCase().includes('townhouse')
            ) {
              propertyType = 'Townhouse';
            }

            const property: Partial<Property> = {
              address,
              city,
              state,
              zipCode,
              price: priceValue,
              bedrooms,
              bathrooms,
              squareFeet,
              propertyType,
              url,
              imageUrl: item.imageUrl,
              source: this.source,
            };

            console.log(`Created property object: ${JSON.stringify(property)}`);

            // Check if this property matches our criteria
            if (this.isPropertyMatch(property)) {
              console.log(
                `✅ MATCH - Adding property: ${property.address}, ${property.city}, ${property.state} ${property.zipCode}`
              );
              properties.push(property);
            } else {
              console.log(
                `❌ NO MATCH - Rejecting property: ${property.address}, ${property.city}, ${property.state} ${property.zipCode}`
              );
              // Log why it didn't match
              if (
                this.options.minPrice &&
                property.price < this.options.minPrice
              ) {
                console.log(
                  `   Price ${property.price} is below minimum ${this.options.minPrice}`
                );
              }
              if (property.price > this.options.maxPrice) {
                console.log(
                  `   Price ${property.price} is above maximum ${this.options.maxPrice}`
                );
              }
              if (property.bedrooms < this.options.minBedrooms) {
                console.log(
                  `   Bedrooms ${property.bedrooms} is below minimum ${this.options.minBedrooms}`
                );
              }
              if (property.bathrooms < this.options.minBathrooms) {
                console.log(
                  `   Bathrooms ${property.bathrooms} is below minimum ${this.options.minBathrooms}`
                );
              }
            }
          }
        } catch (error) {
          console.error('Error scraping Zillow:', error);

          // Take a screenshot when an error occurs to help with debugging
          try {
            await page.screenshot({ path: 'zillow-error.png', fullPage: true });
            console.log('Error screenshot saved to zillow-error.png');
          } catch (screenshotError) {
            console.error('Failed to take error screenshot:', screenshotError);
          }
        }
      }

      console.log(
        `Found ${properties.length} matching properties across all locations`
      );

      // Convert partial properties to full property objects
      return properties as Property[];
    } finally {
      await browser.close();
    }
  }
}
