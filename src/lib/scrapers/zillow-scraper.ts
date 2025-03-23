import { Property } from '@prisma/client';
import { BaseScraper, ScraperOptions } from './base-scraper';
import puppeteer from 'puppeteer';

export class ZillowScraper extends BaseScraper {
  constructor(options: ScraperOptions) {
    super(options, 'zillow');
  }

  /**
   * Handles Zillow's "Press and Hold" captcha verification
   * @param page Puppeteer page object
   */
  private async handlePressAndHoldCaptcha(page: puppeteer.Page): Promise<void> {
    console.log('Checking for captcha...');

    // Try to find captcha elements
    const captchaSelectors = [
      // Common selectors that might indicate a captcha
      'iframe[title*="recaptcha"]',
      'iframe[src*="captcha"]',
      '.captcha-container',
      '#captcha',
      // Zillow-specific press-and-hold selectors
      '.captcha-holder',
      '[data-testid="challenge-stage-holder"]',
      '[data-testid="challenge"]',
      'button[data-testid="hold-button"]',
      '.recaptcha-checkbox-checkmark',
    ];

    let captchaFound = false;

    for (const selector of captchaSelectors) {
      const captchaExists = await page.evaluate((sel) => {
        return document.querySelector(sel) !== null;
      }, selector);

      if (captchaExists) {
        captchaFound = true;
        console.log(`Captcha found with selector: ${selector}`);
        break;
      }
    }

    if (!captchaFound) {
      console.log('No captcha detected, continuing...');
      return;
    }

    // Take a screenshot of the captcha for debugging
    await page.screenshot({ path: 'captcha-detected.png' });
    console.log('Screenshot saved of captcha page');

    try {
      // Try to find and handle a press-and-hold button
      const holdButton =
        (await page.$('[data-testid="hold-button"]')) ||
        (await page.$('.captcha-holder button')) ||
        (await page.$('.g-recaptcha'));

      if (holdButton) {
        console.log('Found press-and-hold button, attempting to solve...');

        // Get button position
        const buttonBox = await holdButton.boundingBox();

        if (buttonBox) {
          // Move to button
          await page.mouse.move(
            buttonBox.x + buttonBox.width / 2,
            buttonBox.y + buttonBox.height / 2
          );

          // Press and hold for a random duration (3-5 seconds to appear human-like)
          const holdDuration = Math.floor(Math.random() * 2000) + 3000;
          console.log(`Pressing and holding for ${holdDuration}ms...`);

          await page.mouse.down();
          await page.waitForTimeout(holdDuration);
          await page.mouse.up();

          // Wait for captcha to process
          await page.waitForTimeout(2000);

          // Take another screenshot to see if it worked
          await page.screenshot({ path: 'after-captcha-attempt.png' });
          console.log('Screenshot saved after captcha attempt');

          // Check if we're now on the search results page
          const resultsExist = await page.evaluate(() => {
            return (
              document.querySelector('[data-test="property-card"]') !== null ||
              document.querySelector('.photo-cards') !== null
            );
          });

          if (resultsExist) {
            console.log('Successfully passed captcha verification!');
          } else {
            console.log('Still seeing captcha or verification page');

            // Give user a chance to manually solve if in non-headless mode
            if (await this.isNonHeadless(page)) {
              console.log(
                'Browser is in non-headless mode. Waiting 30 seconds for manual captcha solving...'
              );
              await page.waitForTimeout(30000);
            }
          }
        }
      } else {
        console.log('Could not find a specific hold button');

        // If in non-headless mode, wait for manual intervention
        if (await this.isNonHeadless(page)) {
          console.log(
            'Browser is in non-headless mode. Waiting 30 seconds for manual captcha solving...'
          );
          await page.waitForTimeout(30000);
        }
      }
    } catch (error) {
      console.error('Error handling captcha:', error);
    }
  }

  /**
   * Check if browser is running in non-headless mode
   */
  private async isNonHeadless(page: puppeteer.Page): Promise<boolean> {
    return await page.evaluate(() => {
      return window.navigator.webdriver === false;
    });
  }

  async scrape(): Promise<Property[]> {
    const browser = await puppeteer.launch({
      headless: false, // Use non-headless mode to appear more human-like
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled', // Hide automation flags
        '--window-size=1920,1080', // Use a standard window size
      ],
    });

    try {
      const page = await browser.newPage();

      // More sophisticated browser fingerprinting evasion
      await page.evaluateOnNewDocument(() => {
        // Override the navigator.webdriver property
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false,
        });

        // Override Chrome automation properties
        window.navigator.chrome = {
          runtime: {},
        };

        // Override permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) =>
          parameters.name === 'notifications'
            ? Promise.resolve({ state: Notification.permission })
            : originalQuery(parameters);

        // Override plugins array to look more like a real browser
        Object.defineProperty(navigator, 'plugins', {
          get: () => [
            {
              0: {
                type: 'application/x-google-chrome-pdf',
                suffixes: 'pdf',
                description: 'Portable Document Format',
              },
              description: 'Chrome PDF Plugin',
              filename: 'internal-pdf-viewer',
              length: 1,
              name: 'Chrome PDF Plugin',
            },
          ],
        });
      });

      // Set user agent of a real browser with common configuration
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      );

      // Add extra headers that a real browser would have
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      });

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

          // Check for and handle the "Press and Hold" captcha
          await this.handlePressAndHoldCaptcha(page);

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
              '.StyledSearchListWrapper-srp-8-109-3__sc-1ieen0c-0',
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
              console.log(
                `Found ${listItems.length} list items in property list`
              );

              // Each list item should contain a property card
              items = Array.from(listItems)
                .map((li) => {
                  // Find the article inside the list item
                  return (
                    li.querySelector('article[data-test="property-card"]') || li
                  );
                })
                .filter((item) => item != null);

              if (items.length > 0) {
                console.log(
                  `Found ${items.length} property cards inside list items`
                );
              }
            }

            // Option 2: If no items found via list, try direct article selectors
            if (items.length === 0) {
              const cardSelectors = [
                'article[data-test="property-card"]',
                '[data-test="property-card"]',
                '.property-card',
                '.list-card',
              ];

              for (const selector of cardSelectors) {
                items = Array.from(document.querySelectorAll(selector));
                if (items.length > 0) {
                  console.log(
                    `Found ${items.length} items with direct selector: ${selector}`
                  );
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
