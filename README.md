# DMV Property Finder

A Next.js application that scrapes real estate websites to find properties in the DC, Maryland, Virginia (DMV) area and sends notifications when new properties matching your criteria are found.

## Features

- Create custom property searches with specific criteria
- Scrape multiple real estate websites for property listings
- Get email notifications when new properties are found
- View and manage your property searches
- Track properties you're interested in
- Supports filtering by price, bedrooms, bathrooms, and location

## Tech Stack

- **Frontend**: Next.js, TypeScript, Tailwind CSS (with tw- prefix)
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Web Scraping**: Puppeteer
- **Deployment**: Vercel (recommended)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables in a `.env` file:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/property_scrape?schema=public"
   ```
4. Set up the database:
   ```bash
   npx prisma migrate dev --name init
   ```
5. Run the development server:
   ```bash
   npm run dev
   ```
6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. Create a new property search with your criteria
2. The system will scrape real estate websites based on your search
3. When new properties are found, you'll receive an email notification
4. View and manage your searches on the dashboard

## Deployment

This project is designed to be deployed to Vercel:

1. Push your code to a GitHub repository
2. Import the project in Vercel
3. Set up the required environment variables
4. Deploy!

## Legal Disclaimer

This application is for personal use only. Please ensure you respect the terms of service of any websites you scrape. Some websites prohibit scraping, and this tool should be used responsibly and in accordance with all applicable laws and terms of service.

## License

MIT