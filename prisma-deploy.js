// This script is used by Vercel to run migrations during build
const { exec } = require('child_process');

console.log('Starting database migration...');
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('DIRECT_URL:', process.env.DIRECT_URL);

// We'll use the DIRECT_URL for migrations
const migrationEnv = {
  ...process.env,
  DATABASE_URL: process.env.DIRECT_URL
};

// Run the migration command
exec('npx prisma migrate deploy', { env: migrationEnv }, (error, stdout, stderr) => {
  if (error) {
    console.error(`Migration error: ${error.message}`);
    process.exit(1);
  }
  
  if (stderr) {
    console.error(`Migration stderr: ${stderr}`);
  }
  
  console.log(`Migration stdout: ${stdout}`);
  console.log('Database migration completed successfully');
});