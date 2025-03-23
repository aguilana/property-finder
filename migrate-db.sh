#!/bin/bash

# This script runs Prisma migrations using the DIRECT_URL
# Make sure to set correct database credentials in .env file first

# Export the DIRECT_URL as DATABASE_URL temporarily for migrations
export DATABASE_URL=$(grep DIRECT_URL .env | cut -d '=' -f2- | tr -d '"')

echo "Using database URL for migration: $DATABASE_URL"

# Run the migrations
npx prisma migrate deploy

# Reset the environment variable
unset DATABASE_URL

echo "Migration complete!"