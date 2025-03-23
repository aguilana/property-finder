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

// Helper function to find user by Clerk ID
async function getUserByClerkId(clerkId: string) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { id: clerkId },
        { clerkId: clerkId }
      ]
    }
  });
  
  console.log(`Looking up user with clerk ID: ${clerkId}, found:`, user?.id);
  return user;
}

export async function GET(req: NextRequest, context: RouteParams) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('CONEXT', context);
    // Access id directly from context.params to avoid the awaiting issue
    const { id } = await context.params;
    console.log(`Processing search request for ID: ${id} from user: ${userId}`);

    // Find the internal user ID from the Clerk ID
    const user = await getUserByClerkId(userId);
    
    if (!user) {
      console.log(`No user found for Clerk ID: ${userId}`);
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
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Handle both Promise and non-Promise cases
    let id: string;
    if (context.params instanceof Promise) {
      const resolvedParams = await context.params;
      id = resolvedParams.id;
    } else {
      id = context.params.id;
    }
    
    console.log(
      `Processing delete request for search ID: ${id} from user: ${userId}`
    );

    // Find the internal user ID from the Clerk ID
    const user = await getUserByClerkId(userId);
    
    if (!user) {
      console.log(`No user found for Clerk ID: ${userId}`);
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
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Handle both Promise and non-Promise cases
    let id: string;
    if (context.params instanceof Promise) {
      const resolvedParams = await context.params;
      id = resolvedParams.id;
    } else {
      id = context.params.id;
    }
    
    console.log(
      `Processing update request for search ID: ${id} from user: ${userId}`
    );

    const body = await req.json();

    // Find the internal user ID from the Clerk ID
    const user = await getUserByClerkId(userId);
    
    if (!user) {
      console.log(`No user found for Clerk ID: ${userId}`);
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
