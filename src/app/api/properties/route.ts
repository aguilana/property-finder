import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuth } from '@clerk/nextjs/server';
import crypto from 'crypto';

// Helper function to find or create a user
async function findOrCreateUser(clerkId: string) {
  // Check if user exists
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { id: clerkId },
        { clerkId: clerkId }
      ]
    }
  });
  
  // If not, create a new user
  if (!user) {
    // Generate a random UUID to use as the internal ID
    const internalId = crypto.randomUUID();
    
    user = await prisma.user.create({
      data: {
        id: internalId,
        clerkId: clerkId,
        name: 'Clerk User',  // Default name
        email: `user-${internalId}@example.com`,  // Placeholder email
      }
    });
    
    console.log("Created new user:", user);
  }
  
  return user;
}

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // First get or create user in our database
    const user = await findOrCreateUser(userId);
    
    // Get query parameters
    const searchId = req.nextUrl.searchParams.get('searchId');
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');
    
    // Build query
    const query: any = {
      where: {
        searches: {
          some: {
            userId: user.id
          }
        }
      }
    };
    
    if (searchId) {
      query.where.searches.some.id = searchId;
    }
    
    // Get total count
    const total = await prisma.property.count(query);
    
    // Get paginated results
    const properties = await prisma.property.findMany({
      ...query,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit
    });
    
    return NextResponse.json({
      properties,
      pagination: {
        total,
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}