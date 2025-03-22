#!/bin/bash

# This script initializes the PostgreSQL database for the property_scrape application

echo "Creating PostgreSQL database 'property_scrape'..."

# Get the current username
USERNAME=$(whoami)

# Try to create the database (may fail if already exists)
createdb property_scrape || echo "Database may already exist, continuing..."

# Run the Prisma migrations
echo "Running Prisma migrations..."
npx prisma migrate deploy

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

echo "Done! Database should be ready to use."