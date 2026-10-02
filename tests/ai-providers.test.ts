import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { resetEnvCache } from "@/lib/env";
import { groqCompletion } from "@/lib/server/ai/groq";
import { routeTutor } from "@/lib/server/ai/tutor-routing";
import { enrichExtractionWithGroq } from "@/lib/server/intelligence/extractor";

beforeEach(() => { vi.stubEnv("GROQ_API_KEY", "test-secret"); resetEnvCache(); });
afterEach(() => { vi.unstubAllEnvs(); resetEnvCache(); });
const groqResponse = (content: string) => Response.json({ choices: [{ message: { content }, finish_reason: "stop" }], usage: { prompt_tokens: 20, completion_tokens: 10 } });


describe("bounded Groq requests", () => {
  it("uses the supported wire format with a hard output cap", async () => {
    const fetchFn = vi.fn().mockResolvedValue(groqResponse("A grounded hint"));
    expect(await groqCompletion({ purpose: "tutor", messages: [{ role: "user", content: "Help" }], maxTokens: 99999, fetchFn })).toBe("A grounded hint");
    expect(fetchFn.mock.calls[0][0]).toBe("https://api.groq.com/openai/v1/chat/completions");
    const request = fetchFn.mock.calls[0][1];
    expect(JSON.parse(request.body)).toMatchObject({ max_completion_tokens: 2400, messages: [{ role: "user", content: "Help" }] });
    expect(request.redirect).toBe("error"); expect(request.signal).toBeInstanceOf(AbortSignal);
  });
  it("rejects excessive context without spending money", async () => {
    const fetchFn=vi.fn();
    await expect(groqCompletion({purpose:"tutor",messages:[{role:"user",content:"x".repeat(36_001)}],fetchFn})).rejects.toMatchObject({reason:"budget"});
    expect(fetchFn).not.toHaveBeenCalled();
  });
  it("does not retry or expose provider error bodies", async () => {
    const fetchFn=vi.fn().mockResolvedValue(new Response('private source and API secret',{status:429}));
    await expect(groqCompletion({purpose:"tutor",messages:[],fetchFn})).rejects.toThrow("AI unavailable: provider");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
  it("rejects malformed and oversized provider responses", async () => {
    for(const reply of [{choices:[]},{choices:[{message:{content:"x".repeat(100001)}}]}]){
      await expect(groqCompletion({purpose:"tutor",messages:[],fetchFn:vi.fn().mockResolvedValue(Response.json(reply))})).rejects.toMatchObject({reason:"response"});
    }
  });
});

describe("tutoring modes", () => {
  it("keeps guided tutoring, debugging and review on the stronger model", () => {
    for (const mode of ["auto", "debug", "review"] as const) expect(routeTutor(mode).model).toBe("openai/gpt-oss-120b");
  });
  it("uses the smaller model for learner-selected explanations, hints and challenges", () => {
    for (const mode of ["explain", "hint", "challenge"] as const) expect(routeTutor(mode)).toEqual({ mode, model: "openai/gpt-oss-20b" });
  });
});

it("rejects invented source paths and excerpts from extraction",async()=>{
  const output={concepts:[{name:"Invented concept",description:"This claim has no evidence.",importance:"core",confidence:1,evidence:[{filePath:"fake.md",excerpt:"Invented evidence"}]}],relationships:[]};
  const base={concepts:[],relationships:[]};
  const result=await enrichExtractionWithGroq(base,[{id:"l",slug:"real",title:"Real",moduleTitle:"Real",order:0,filePath:"real.md",markdown:"Real source content"}],vi.fn().mockResolvedValue(groqResponse(JSON.stringify(output))));
  expect(result).toEqual(base);
});
