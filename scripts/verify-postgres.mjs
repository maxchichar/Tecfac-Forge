import nextEnv from '@next/env';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
nextEnv.loadEnvConfig(process.cwd());
const db=new PrismaClient();
const schema='forge_test_'+randomUUID().replaceAll('-','');
const url=new URL(process.env.DATABASE_URL);url.searchParams.set('schema',schema);
const env={...process.env,DATABASE_URL:url.toString(),PROJECT_TEST_DATABASE_URL:url.toString(),RUN_PROJECT_INTEGRATION:'true'};
let created=false;
try{
 await db.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);created=true;
 const migration=spawnSync('node',['node_modules/prisma/build/index.js','migrate','deploy'],{env,encoding:'utf8',timeout:120000});
 if(migration.status!==0)throw new Error('Isolated migration failed');
 console.log('All migrations applied successfully to an isolated schema.');
 const tests=spawnSync('node',['node_modules/vitest/vitest.mjs','run','tests/project-integration.test.ts','tests/quota-integration.test.ts','--testTimeout','30000'],{env,encoding:'utf8',timeout:180000});
 const output=(tests.stdout+'\n'+tests.stderr).replaceAll(process.env.DATABASE_URL,'[database]').replaceAll(url.toString(),'[test database]');
 console.log(output);
 if(tests.status!==0)process.exitCode=1;
}catch(error){console.error(error.message==='Isolated migration failed'?error.message:'Isolated database verification failed.');process.exitCode=1;}
finally{if(created)await db.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);await db.$disconnect();}
