import { NextRequest, NextResponse } from 'next/server';
import { PropertyService } from '@/lib/services/property-service';
import { getAuth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);

    console.log('User ID:', userId);

    if (!userId) {
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

    // Find internal user ID from Clerk ID
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: userId },
          { clerkId: userId }
        ]
      }
    });
    
    if (!user) {
      console.log(`No user found for Clerk ID: ${userId}`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    console.log(`Found user with ID: ${user.id}`);
    
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
