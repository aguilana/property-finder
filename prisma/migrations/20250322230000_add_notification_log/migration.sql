-- First check if clerkId column exists in User table, if not, add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'User' AND column_name = 'clerkId'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "clerkId" TEXT;
  END IF;
END $$;

-- Then add unique constraint on clerkId 
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'User_clerkId_key'
  ) THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_clerkId_key" UNIQUE ("clerkId");
  END IF;
END $$;

-- Add notificationStatus field to Property table
ALTER TABLE "Property" ADD COLUMN "notificationStatus" TEXT;

-- Create NotificationLog table
CREATE TABLE "NotificationLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- Add relation between NotificationLog and Property
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;