import nextEnv from '@next/env';
import { PrismaClient } from '@prisma/client';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
nextEnv.loadEnvConfig(process.cwd());
const db=new PrismaClient();
try {
 const tables=await db.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='_prisma_migrations'`;
 if(tables.length===0){
  if(!fs.readdirSync('.local-backups').some(x=>x.startsWith('pre-deploy-')))throw new Error('Verified backup required');
  const diff=spawnSync('node',['node_modules/prisma/build/index.js','migrate','diff','--from-url',process.env.DATABASE_URL,'--to-schema-datamodel','.local-backups/baseline.prisma','--exit-code'],{encoding:'utf8',timeout:60000});
  if(diff.status!==0)throw new Error('Baseline mismatch');
  const resolve=spawnSync('node',['node_modules/prisma/build/index.js','migrate','resolve','--applied','202610020001_baseline'],{encoding:'utf8',timeout:60000});
  if(resolve.status!==0)throw new Error('Baseline resolve failed');
  console.log('Verified existing schema registered as baseline.');
 }
 const deploy=spawnSync('node',['node_modules/prisma/build/index.js','migrate','deploy'],{encoding:'utf8',timeout:120000});
 if(deploy.status!==0)throw new Error('Migration failed; inspect migration state before retrying');
 const migrations=await db.$queryRaw`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY migration_name`;
 console.log('Applied migrations: '+migrations.map(x=>x.migration_name).join(', '));
 console.log('Existing users: '+await db.user.count()+', courses: '+await db.course.count());
}catch(error){console.error(['Verified backup required','Baseline mismatch','Baseline resolve failed','Migration failed; inspect migration state before retrying'].includes(error.message)?error.message:'Database migration failed safely.');process.exitCode=1;}finally{await db.$disconnect();}
