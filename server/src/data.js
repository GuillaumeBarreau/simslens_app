const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('❌ [Database] DATABASE_URL not defined');
  process.exit(1);
}
console.log('✅ [Database] Configuration loaded');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

console.log('✅ [Database] Prisma Client initialized with PostgreSQL adapter');

module.exports = {
  db: prisma,
  prisma: prisma,
};
