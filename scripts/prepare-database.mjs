import nextEnv from '@next/env';
import { PrismaClient } from '@prisma/client';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
nextEnv.loadEnvConfig(process.cwd());
const db=new PrismaClient();
const directory='.local-backups';
fs.mkdirSync(directory,{recursive:true,mode:0o700});
try {
 const prior=spawnSync('git',['show','7cf57598a93bd3e2e74d6b71a6e256070b2e5fee:prisma/schema.prisma'],{encoding:'utf8'});
 if(prior.status!==0)throw new Error('baseline');
 fs.writeFileSync(directory+'/baseline.prisma',prior.stdout,{mode:0o600});
 const diff=spawnSync('node',['node_modules/prisma/build/index.js','migrate','diff','--from-url',process.env.DATABASE_URL,'--to-schema-datamodel',directory+'/baseline.prisma','--script','--exit-code'],{encoding:'utf8',env:process.env,timeout:60000});
 fs.writeFileSync(directory+'/baseline-diff.sql',diff.stdout||'',{mode:0o600});
 if(diff.status!==0){console.log('Existing database does not exactly match the baseline. Migration paused; schema diff saved locally.');process.exitCode=1;}
 else {
  const snapshot=await db.$transaction(async tx=>{
   const tables=await tx.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`;
   const data={};
   for(const {table_name:name} of tables){if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))throw new Error('table');data[name]=await tx.$queryRawUnsafe(`SELECT to_jsonb(t) AS record FROM "${name}" t`);}
   return data;
  },{isolationLevel:'RepeatableRead',timeout:60000});
  const file=directory+'/pre-deploy-'+new Date().toISOString().replaceAll(':','-')+'.json';
  fs.writeFileSync(file,JSON.stringify(snapshot),{mode:0o600});
  console.log('Baseline matches. Consistent pre-deployment data snapshot saved with restricted permissions. No database changes made.');
 }
} catch {console.error('Database preparation failed safely. No schema changes made.');process.exitCode=1;}
finally{await db.$disconnect();}
