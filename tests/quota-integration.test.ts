import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
const enabled=process.env.RUN_PROJECT_INTEGRATION==="true";
let db:typeof import("@/lib/prisma").prisma;
let consume:typeof import("@/lib/server/ai/quota").consumeQuotas;
describe.skipIf(!enabled)("shared quotas on isolated PostgreSQL",()=>{
 beforeAll(async()=>{
  const raw=process.env.PROJECT_TEST_DATABASE_URL;
  if(!raw || !/^forge_test_[a-f0-9]{32}$/.test(new URL(raw).searchParams.get("schema")??""))throw new Error("Isolated test schema required");
  vi.stubEnv("DATABASE_URL",raw);
  ({prisma:db}=await import("@/lib/prisma"));({consumeQuotas:consume}=await import("@/lib/server/ai/quota"));
 });
 afterAll(async()=>{await db?.$disconnect();vi.unstubAllEnvs();});
 it("allows exactly the budget under concurrent requests",async()=>{
  const requests=await Promise.allSettled(Array.from({length:12},()=>consume([{key:"test-concurrent",max:3,windowSeconds:60}])));
  expect(requests.filter(r=>r.status==="fulfilled")).toHaveLength(3);
  expect((await db.usageQuota.findUniqueOrThrow({where:{key:"test-concurrent"}})).count).toBe(3);
 });
 it("rolls back all counters if a later limit rejects the request",async()=>{
  await consume([{key:"z-exhausted",max:1,windowSeconds:60}]);
  await expect(consume([{key:"a-unused",max:10,windowSeconds:60},{key:"z-exhausted",max:1,windowSeconds:60}])).rejects.toThrow("Usage limit reached");
  expect(await db.usageQuota.findUnique({where:{key:"a-unused"}})).toBeNull();
 });
 it("renews expired windows instead of permanently blocking the user",async()=>{
  await db.usageQuota.create({data:{key:"test-expired",count:100,expiresAt:new Date(0)}});
  await consume([{key:"test-expired",max:2,windowSeconds:60}]);
  expect((await db.usageQuota.findUniqueOrThrow({where:{key:"test-expired"}})).count).toBe(1);
 });
});
