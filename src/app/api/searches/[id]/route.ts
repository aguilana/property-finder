import { NextRequest, NextResponse } from 'next/server';
import { PropertyService } from '@/lib/services/property-service';
import { PrismaClient } from '@prisma/client';
import { getAuth } from '@clerk/nextjs/server';

const prisma = new PrismaClient();
let RETRIES = 5;

interface RouteParams {
  params: {
    id: string;
  };
}

// Helper function to find user by ID (works with both Clerk ID and internal ID)
async function getUserByAnyId(userId: string) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // For development, if userId is missing or malformed, use a default test user ID
  if (isDevelopment && (!userId || userId === 'undefined' || userId === 'null')) {
    console.log('Using default test user ID for development');
    userId = 'test-user-123';
  }
  
  // First try to find the user
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { id: userId },
        { clerkId: userId }
      ]
    }
  });
  
  if (user) {
    console.log(`Found user with ID: ${user.id} for input ID: ${userId}`);
    return user;
  }
  
  // In development mode, if user not found, create a test user
  if (isDevelopment) {
    console.log(`User not found for ID: ${userId}, creating test user in development mode`);
    
    // Create a new test user
    const newUser = await prisma.user.create({
      data: {
        id: userId,
        clerkId: userId,
        name: 'Test User',
        email: 'test@example.com',
      }
    });
    
    console.log(`Created test user with ID: ${newUser.id}`);
    return newUser;
  }
  
  console.log(`No user found for ID: ${userId}`);
  return null;
}

export async function GET(req: NextRequest, context: RouteParams) {
  try {
    let userId;
    
    try {
      const auth = getAuth(req);
      userId = auth.userId;
      console.log('Successfully authenticated with Clerk:', userId);
    } catch (error) {
      console.error('Clerk authentication error:', error);
      // Fall back to extracting from headers for development/testing
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        userId = authHeader.substring(7);
        console.log('Using userId from Authorization header:', userId);
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Context:', context);
    // Access id directly from context.params to avoid the awaiting issue
    const { id } = context.params;
    console.log(`Processing search request for ID: ${id} from user: ${userId}`);

    // Find the internal user ID
    const user = await getUserByAnyId(userId);
    
    if (!user) {
      console.log(`No user found for ID: ${userId}`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Get the search using the internal user ID
    let search = await prisma.propertySearch.findFirst({
      where: {
        id,
        userId: user.id, // Use the internal user ID, not the Clerk ID
      },
    });

    while (!search && RETRIES > 0) {
      console.log(`Retrying search with user ID: ${user.id}`);
      search = await prisma.propertySearch.findFirst({
        where: {
          id,
          userId: user.id,
        },
      });
      RETRIES--;
    }

    console.log('SEARCH', search);

    if (!search) {
      return NextResponse.json({ error: 'Search not found' }, { status: 404 });
    }

    // Get properties for this search
    const service = new PropertyService();
    const properties = await service.getPropertiesBySearch(id, user.id);

    return NextResponse.json({
      search,
      properties,
    });
  } catch (error) {
    console.error('Error fetching search details:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'An unknown error occurred',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteParams) {
  try {
    let userId;
    
    try {
      const auth = getAuth(req);
      userId = auth.userId;
      console.log('Successfully authenticated with Clerk:', userId);
    } catch (error) {
      console.error('Clerk authentication error:', error);
      // Fall back to extracting from headers for development/testing
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        userId = authHeader.substring(7);
        console.log('Using userId from Authorization header:', userId);
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get ID from context params
    const { id } = context.params;
    
    console.log(
      `Processing delete request for search ID: ${id} from user: ${userId}`
    );

    // Find the internal user ID
    const user = await getUserByAnyId(userId);
    
    if (!user) {
      console.log(`No user found for ID: ${userId}`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Check if search exists and belongs to the user
    const search = await prisma.propertySearch.findFirst({
      where: {
        id,
        userId: user.id, // Use the internal user ID, not the Clerk ID
      },
    });

    if (!search) {
      return NextResponse.json({ error: 'Search not found' }, { status: 404 });
    }

    // Delete the search
    await prisma.propertySearch.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting search:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'An unknown error occurred',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, context: RouteParams) {
  try {
    let userId;
    
    try {
      const auth = getAuth(req);
      userId = auth.userId;
      console.log('Successfully authenticated with Clerk:', userId);
    } catch (error) {
      console.error('Clerk authentication error:', error);
      // Fall back to extracting from headers for development/testing
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        userId = authHeader.substring(7);
        console.log('Using userId from Authorization header:', userId);
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get ID from context params
    const { id } = context.params;
    
    console.log(
      `Processing update request for search ID: ${id} from user: ${userId}`
    );

    const body = await req.json();

    // Find the internal user ID
    const user = await getUserByAnyId(userId);
    
    if (!user) {
      console.log(`No user found for ID: ${userId}`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Check if search exists and belongs to the user
    const search = await prisma.propertySearch.findFirst({
      where: {
        id,
        userId: user.id, // Use the internal user ID, not the Clerk ID
      },
    });

    if (!search) {
      return NextResponse.json({ error: 'Search not found' }, { status: 404 });
    }

    // Update the search
    const updatedSearch = await prisma.propertySearch.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(updatedSearch);
  } catch (error) {
    console.error('Error updating search:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'An unknown error occurred',
      },
      { status: 500 }
    );
  }
}