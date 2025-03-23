import { PrismaClient, Property, PropertySearch, User } from '@prisma/client';
import { BaseScraper, ScraperOptions } from '../scrapers/base-scraper';
import { ZillowScraper } from '../scrapers/zillow-scraper';
import { EmailService } from './email-service';
import crypto from 'crypto';

const prisma = new PrismaClient();
const emailService = new EmailService();

export class PropertyService {
  async runScraper(searchId: string): Promise<void> {
    // Get the search parameters with user info
    const search = await prisma.propertySearch.findUnique({
      where: { id: searchId },
      include: { user: true }
    });

    if (!search || !search.isActive) {
      throw new Error('Search not found or not active');
    }

    // Create scraper options from search parameters
    const scraperOptions: ScraperOptions = {
      minPrice: search.minPrice || undefined,
      maxPrice: search.maxPrice,
      minBedrooms: search.minBedrooms,
      minBathrooms: search.minBathrooms,
      locations: search.location,
    };

    // Initialize scrapers
    const scrapers: BaseScraper[] = [
      new ZillowScraper(scraperOptions),
      // Add more scrapers here
    ];

    // Create scrape log
    const scrapeLog = await prisma.scrapeLog.create({
      data: {
        source: 'multiple',
        status: 'running',
      },
    });

    try {
      // Run all scrapers and collect properties
      const allProperties: Property[] = [];
      let newPropertiesCount = 0;

      for (const scraper of scrapers) {
        const properties = await scraper.scrape();
        allProperties.push(...properties);
      }

      // Process each property
      for (const property of allProperties) {
        // Check if property already exists in database
        const existingProperty = await prisma.property.findUnique({
          where: { url: property.url },
        });

        if (!existingProperty) {
          // Save new property
          const savedProperty = await prisma.property.create({
            data: {
              ...property,
              searches: {
                connect: { id: search.id },
              },
            },
          });

          // Property is new, increment counter
          newPropertiesCount++;

          // Handle notification if needed
          if (search.notifyOnNew && search.user.email) {
            await this.sendNotification(savedProperty, search.user);
          }
        }
      }

      // Update scrape log
      await prisma.scrapeLog.update({
        where: { id: scrapeLog.id },
        data: {
          status: 'success',
          endTime: new Date(),
          itemsFound: allProperties.length,
          newItems: newPropertiesCount,
        },
      });

      // Update lastCheckedAt for the search
      await prisma.propertySearch.update({
        where: { id: search.id },
        data: { lastCheckedAt: new Date() },
      });

    } catch (error) {
      // Update scrape log with error
      await prisma.scrapeLog.update({
        where: { id: scrapeLog.id },
        data: {
          status: 'failed',
          endTime: new Date(),
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
      
      throw error;
    }
  }

  private async sendNotification(property: Property, user: User): Promise<void> {
    if (!user.email) {
      console.log('Cannot send notification - user has no email');
      return;
    }
    
    // Skip sending to placeholder emails
    if (user.email.includes('@example.com')) {
      console.log(`Skipping notification to placeholder email: ${user.email}`);
      return;
    }
    
    try {
      console.log(`Attempting to send notification to ${user.email} for property: ${property.address}`);
      await emailService.sendPropertyNotification(property, user.email);
      
      // Mark property as notified
      await prisma.property.update({
        where: { id: property.id },
        data: { isNotified: true }
      });
      
      console.log(`Notification sent to ${user.email} for property: ${property.address}`);
    } catch (error) {
      console.error('Failed to send notification:', error);
      
      // Still mark as attempted notification to avoid repeated failures
      await prisma.property.update({
        where: { id: property.id },
        data: { 
          isNotified: true,
          notificationStatus: 'failed'
        }
      });
      
      // Record error in notification log
      await prisma.notificationLog.create({
        data: {
          userId: user.id,
          propertyId: property.id,
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      }).catch(err => {
        // If log creation fails, just continue
        console.error('Failed to create notification log:', err);
      });
    }
  }

  async getSearches(userId: string): Promise<PropertySearch[]> {
    return prisma.propertySearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getPropertiesBySearch(searchId: string, userId: string): Promise<Property[]> {
    // First check if userId is a Clerk ID or internal ID
    let userIdToUse = userId;
    
    // Check if this is a Clerk ID
    if (userId.startsWith('user_')) {
      const user = await prisma.user.findFirst({
        where: { clerkId: userId }
      });
      
      if (!user) {
        throw new Error('User not found');
      }
      
      userIdToUse = user.id;
    }
    
    // Then verify the search belongs to the user
    const search = await prisma.propertySearch.findFirst({
      where: {
        id: searchId,
        userId: userIdToUse
      }
    });
    
    if (!search) {
      throw new Error('Search not found or not authorized');
    }
    
    return prisma.property.findMany({
      where: {
        searches: {
          some: {
            id: searchId
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createSearch(
    data: Omit<PropertySearch, 'id' | 'createdAt' | 'updatedAt' | 'lastCheckedAt' | 'userId'>, 
    userId: string
  ): Promise<PropertySearch> {
    // First, check if the user exists by either the ID or clerkId
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: userId },
          { clerkId: userId }
        ]
      }
    });
    
    // If no user exists with this ID, create one
    if (!user) {
      // Generate a random UUID to use as the internal ID
      const internalId = crypto.randomUUID();
      
      user = await prisma.user.create({
        data: {
          id: internalId,
          clerkId: userId,
          name: 'Clerk User',  // Default name
          email: `user-${internalId}@example.com`,  // Placeholder email
        }
      });
      
      console.log("Created new user:", user);
    }
    
    // Now create the search associated with this user
    return prisma.propertySearch.create({
      data: {
        ...data,
        user: {
          connect: { id: user.id }  // Connect to our internal User ID
        }
      }
    });
  }
}