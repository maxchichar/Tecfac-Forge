import nextEnv from '@next/env';
import { spawnSync } from 'node:child_process';
nextEnv.loadEnvConfig(process.cwd());
// Values travel over stdin, never command arguments or logs.
const keys=['DATABASE_URL','BETTER_AUTH_SECRET','GROQ_API_KEY'];
for(const name of keys){
 const value=process.env[name];if(!value){console.error(name+': missing');process.exit(1);}
 const r=spawnSync('npx',['--yes','vercel','env','add',name,'production','--sensitive','--force','--yes','--scope','chibueze-maxwells-projects'],{input:value,encoding:'utf8',timeout:60000});
 console.log(name+': '+(r.status===0?'configured securely':'configuration failed'));if(r.status!==0)process.exit(1);
}
