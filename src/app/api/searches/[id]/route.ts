import { NextRequest, NextResponse } from 'next/server';
import { PropertyService } from '@/lib/services/property-service';
import { PrismaClient } from '@prisma/client';
import { getAuth } from '@clerk/nextjs/server';

const prisma = new PrismaClient();

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = getAuth(req);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id } = params;
    
    // Get the search
    const search = await prisma.propertySearch.findFirst({
      where: { 
        id,
        userId: userId
      }
    });
    
    if (!search) {
      return NextResponse.json(
        { error: 'Search not found' },
        { status: 404 }
      );
    }
    
    // Get properties for this search
    const service = new PropertyService();
    const properties = await service.getPropertiesBySearch(id, userId);
    
    return NextResponse.json({
      search,
      properties
    });
  } catch (error) {
    console.error('Error fetching search details:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = getAuth(req);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id } = params;
    
    // Check if search exists and belongs to the user
    const search = await prisma.propertySearch.findFirst({
      where: { 
        id,
        userId: userId
      }
    });
    
    if (!search) {
      return NextResponse.json(
        { error: 'Search not found' },
        { status: 404 }
      );
    }
    
    // Delete the search
    await prisma.propertySearch.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting search:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = getAuth(req);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id } = params;
    const body = await req.json();
    
    // Check if search exists and belongs to the user
    const search = await prisma.propertySearch.findFirst({
      where: { 
        id,
        userId: userId
      }
    });
    
    if (!search) {
      return NextResponse.json(
        { error: 'Search not found' },
        { status: 404 }
      );
    }
    
    // Update the search
    const updatedSearch = await prisma.propertySearch.update({
      where: { id },
      data: body
    });
    
    return NextResponse.json(updatedSearch);
  } catch (error) {
    console.error('Error updating search:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}