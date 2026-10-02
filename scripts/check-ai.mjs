import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const calls=[
 ['Groq',process.env.GROQ_API_KEY,'https://api.groq.com/openai/v1/chat/completions',{model:'openai/gpt-oss-120b',reasoning_effort:'low',messages:[{role:'user',content:'Reply with the word ready.'}],max_completion_tokens:256}],
];
for(const [name,key,url,body] of calls){
 if(!key){console.log(name+': key missing');process.exitCode=1;continue;}
 try{const r=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});const data=await r.json();console.log(name+': HTTP '+r.status+(r.ok?' (response shape '+(name==='Groq'?Boolean(data.choices?.[0]?.message?.content):Boolean(data.answers?.simple))+')':''));if(!r.ok){process.exitCode=1;let message=String(data.error?.message??data.message??'No error message');for(const value of Object.values(process.env)){if(value && value.length>12)message=message.replaceAll(value,'[redacted]');}console.log(name+' error: '+message.slice(0,400));}}catch{console.log(name+': connection failed');process.exitCode=1;}
}
