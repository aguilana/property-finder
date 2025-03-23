import { NextRequest, NextResponse } from 'next/server';
import { PropertyService } from '@/lib/services/property-service';
import { getAuth, clerkClient } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Helper function to find or create a user
async function findOrCreateUser(userId: string) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // For development, if userId is missing or malformed, use a default test user ID
  if (isDevelopment && (!userId || userId === 'undefined' || userId === 'null')) {
    console.log('Using default test user ID for development');
    userId = 'test-user-123';
  }
  
  console.log(`Looking up user with ID: ${userId}`);
  
  // Check if user exists by either ID or clerkId
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { id: userId },
        { clerkId: userId }
      ]
    }
  });
  
  let userEmail = null;
  let userName = 'App User';
  
  // Try to get user data from Clerk if available (not in development mode)
  if (!isDevelopment) {
    try {
      if (clerkClient?.users) {
        const clerkUser = await clerkClient.users.getUser(userId);
        userEmail = clerkUser.emailAddresses[0]?.emailAddress;
        userName = clerkUser.firstName && clerkUser.lastName 
          ? `${clerkUser.firstName} ${clerkUser.lastName}`
          : clerkUser.firstName || 'App User';
        console.log("Successfully fetched user data from Clerk");
      } else {
        console.warn("Clerk client or users API not available");
      }
    } catch (error) {
      console.error("Error fetching user data from Clerk:", error);
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
      }
    });
    
    console.log("Created new user:", user);
  } 
  // If user exists but has placeholder email, update with real email if we got it
  else if (user.email?.includes('@example.com') && userEmail) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { 
        email: userEmail,
        name: user.name === 'App User' ? userName : user.name
      }
    });
    
    console.log("Updated user with real email:", user);
  }
  
  return user;
}

export async function GET(request: NextRequest) {
  try {
    // Try to get userId from Clerk first
    let userId = null;
    try {
      const auth = getAuth(request);
      userId = auth?.userId || null;
      console.log('Clerk auth result:', auth?.userId ? 'User authenticated' : 'No user found');
    } catch (clerkError) {
      console.log('Clerk auth error or not configured:', clerkError);
    }
    
    // If we don't have a userId from Clerk, try to get it from the request headers
    // This could be from NextAuth or another auth mechanism
    if (!userId) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        userId = authHeader.substring(7);
        console.log('Using userId from Authorization header');
      } else {
        console.log('No Authorization header found');
      }
    }
    
    if (!userId) {
      console.log('No authentication found in either Clerk or Authorization header');
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
    // Try to get userId from Clerk first
    let userId = null;
    try {
      const auth = getAuth(req);
      userId = auth?.userId || null;
      console.log('Clerk auth result:', auth?.userId ? 'User authenticated' : 'No user found');
    } catch (clerkError) {
      console.log('Clerk auth error or not configured:', clerkError);
    }
    
    // If we don't have a userId from Clerk, try to get it from the request headers
    // This could be from NextAuth or another auth mechanism
    if (!userId) {
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        userId = authHeader.substring(7);
        console.log('Using userId from Authorization header');
      } else {
        console.log('No Authorization header found');
      }
    }
    
    if (!userId) {
      console.log('No authentication found in either Clerk or Authorization header');
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