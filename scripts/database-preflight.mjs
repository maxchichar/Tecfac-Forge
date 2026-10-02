import nextEnv from '@next/env';
const { loadEnvConfig } = nextEnv;
import { PrismaClient } from '@prisma/client';
loadEnvConfig(process.cwd());
const db = new PrismaClient();
try {
  const tables = await db.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`;
  console.log(JSON.stringify({tables:tables.map(t=>t.table_name)}));
  if(tables.some(t=>t.table_name==='User')) {
    const counts=await db.$queryRaw`SELECT (SELECT count(*)::int FROM "User") AS users, (SELECT count(*)::int FROM "Course") AS courses`;
    console.log(JSON.stringify({counts}));
  }
  if(tables.some(t=>t.table_name==='_prisma_migrations')) {
    const migrations = await db.$queryRaw`SELECT migration_name, finished_at IS NOT NULL AS finished, rolled_back_at IS NOT NULL AS rolled_back FROM "_prisma_migrations" ORDER BY started_at`;
    console.log(JSON.stringify({migrations}));
  }
} catch { console.error('Database preflight could not connect or inspect the schema. No changes were made.');process.exitCode=1; }
finally {await db.$disconnect();}
