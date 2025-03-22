import { NextRequest, NextResponse } from 'next/server';
import { PropertyService } from '@/lib/services/property-service';
import { getAuth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

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

export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // First get or create user in our database
    const user = await findOrCreateUser(userId);
    
    const service = new PropertyService();
    const searches = await service.getSearches(user.id);
    
    return NextResponse.json(searches);
  } catch (error) {
    console.error('Error fetching searches:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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
    
    console.log("Creating search with internal userId:", user.id);
    
    const body = await req.json();
    const { 
      name, 
      minPrice, 
      maxPrice, 
      minBedrooms, 
      minBathrooms, 
      location, 
      notifyOnNew
    } = body;
    
    // Validate required fields
    if (!name || !maxPrice || !minBedrooms || !minBathrooms || !location) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate location is an array
    if (!Array.isArray(location) || location.length === 0) {
      return NextResponse.json(
        { error: 'Location must be a non-empty array of strings' },
        { status: 400 }
      );
    }
    
    const service = new PropertyService();
    const newSearch = await service.createSearch({
      name,
      minPrice,
      maxPrice,
      minBedrooms,
      minBathrooms,
      location,
      isActive: true,
      notifyOnNew: notifyOnNew ?? true
    }, user.id);
    
    return NextResponse.json(newSearch);
  } catch (error) {
    console.error('Error creating search:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}