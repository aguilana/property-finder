import { NextRequest, NextResponse } from 'next/server';
import { PropertyService } from '@/lib/services/property-service';
import { getAuth, clerkClient } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Helper function to find or create a user with real email from Clerk
async function findOrCreateUser(userId: string) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // For development, if userId is missing or malformed, use a default test user ID
  if (
    isDevelopment &&
    (!userId || userId === 'undefined' || userId === 'null')
  ) {
    console.log('Using default test user ID for development');
    userId = 'test-user-123';
  }

  console.log(`Looking up user with ID: ${userId}`);

  // Check if user exists by either ID or clerkId
  let user = await prisma.user.findFirst({
    where: {
      OR: [{ id: userId }, { clerkId: userId }],
    },
  });

  let userEmail = null;
  let userName = 'App User';

  // Try to get user data from Clerk if available (not in development mode)
  if (!isDevelopment) {
    try {
      if (clerkClient?.users) {
        const clerkUser = await clerkClient.users.getUser(userId);
        userEmail = clerkUser.emailAddresses[0]?.emailAddress;
        userName =
          clerkUser.firstName && clerkUser.lastName
            ? `${clerkUser.firstName} ${clerkUser.lastName}`
            : clerkUser.firstName || 'App User';
        console.log('Successfully fetched user data from Clerk');
      } else {
        console.warn('Clerk client or users API not available');
      }
    } catch (error) {
      console.error('Error fetching user data from Clerk:', error);
      // Continue with default values
    }
  } else {
    // In development, use testing values
    userEmail = 'test@example.com';
    userName = 'Test User';
  }

  // If user doesn't exist, create a new user
  if (!user) {
    // Generate a random UUID to use as the internal ID (or use userId if in dev)
    const internalId = isDevelopment ? userId : crypto.randomUUID();

    user = await prisma.user.create({
      data: {
        id: internalId,
        clerkId: userId, // Store the original ID as clerkId
        name: userName,
        email: userEmail || `user-${internalId}@example.com`, // Use actual email if available
      },
    });

    console.log('Created new user:', user);
  }
  // If user exists but has placeholder email, update with real email if we got it
  else if (user.email?.includes('@example.com') && userEmail) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        email: userEmail,
        name: user.name === 'App User' ? userName : user.name,
      },
    });

    console.log('Updated user with real email:', user);
  }

  return user;
}

export async function POST(req: NextRequest) {
  try {
    // Try to get userId from Clerk first
    let userId = null;
    try {
      const auth = getAuth(req);
      userId = auth?.userId || null;
      console.log(
        'Clerk auth result:',
        auth?.userId ? 'User authenticated' : 'No user found'
      );
    } catch (clerkError) {
      console.log('Clerk auth error or not configured:', clerkError);
    }

    // If we don't have a userId from Clerk, try to get it from the request headers
    if (!userId) {
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        userId = authHeader.substring(7);
        console.log('Using userId from Authorization header');
      } else {
        console.log('No Authorization header found');
      }
    }

    console.log('User ID:', userId);

    if (!userId) {
      console.log(
        'No authentication found in either Clerk or Authorization header'
      );
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { searchId } = body;

    console.log('Search ID:', searchId);

    if (!searchId) {
      return NextResponse.json(
        { error: 'Search ID is required' },
        { status: 400 }
      );
    }

    // Use the helper function to find or create user
    const user = await findOrCreateUser(userId);

    if (!user) {
      console.log(`Failed to create user for ID: ${userId}`);
      return NextResponse.json(
        { error: 'User creation failed' },
        { status: 500 }
      );
    }

    console.log(`Using user with ID: ${user.id} and email: ${user.email}`);

    // Verify the search belongs to the user using internal ID
    const search = await prisma.propertySearch.findFirst({
      where: {
        id: searchId,
        userId: user.id,
      },
    });

    console.log('Search:', search);

    if (!search) {
      return NextResponse.json(
        { error: 'Search not found or not authorized' },
        { status: 404 }
      );
    }

    const service = new PropertyService();
    await service.runScraper(searchId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error running scraper:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'An unknown error occurred',
      },
      { status: 500 }
    );
  }
}

// For scheduled scrapes in a production environment, you would add a GET endpoint
// that could be triggered by a cron job or similar
export async function GET(req: NextRequest) {
  // This endpoint requires an API key for security when triggered by a cron job
  const apiKey = req.headers.get('x-api-key');

  if (!apiKey || apiKey !== process.env.CRON_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get searchId from query parameters
  const searchId = req.nextUrl.searchParams.get('searchId');

  if (!searchId) {
    return NextResponse.json(
      { error: 'Search ID is required as a query parameter' },
      { status: 400 }
    );
  }

  try {
    const service = new PropertyService();
    await service.runScraper(searchId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error running scheduled scraper:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'An unknown error occurred',
      },
      { status: 500 }
    );
  }
}
