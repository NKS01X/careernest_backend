import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
import OpenAI from "openai";

const grok = new OpenAI({
  apiKey: process.env.GROK_API, 
  baseURL: "https://api.x.ai/v1",
});

export const parseResumeToJSON = async (pdfBuffer: Buffer) => {
  const pdfData = await pdf(pdfBuffer);
  const rawText = pdfData.text;

  const systemPrompt = `
    You are an expert HR data extraction AI. 
    Your job is to read a raw resume and output ONLY a valid JSON object.
    
    The JSON object must strictly follow this exact schema:
    {
      "skills": ["string", "string"],
      "achievements": ["string", "string"],
      "projects": [
        {
          "title": "string",
          "description": "string",
          "technologies": ["string", "string"]
        }
      ],
      "workExp": [
        {
          "company": "string",
          "role": "string",
          "startDate": "YYYY-MM-DD",
          "endDate": "YYYY-MM-DD or null if currently employed",
          "description": "string"
        }
      ]
    }
    
    If data is missing, return an empty array []. Do not include markdown blocks.
  `;

  const response = await grok.chat.completions.create({
    model: "grok-2-latest", 
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Resume text:\n\n${rawText}` }
    ],
    response_format: { type: "json_object" }, 
    temperature: 0.1, 
  });

  const responseText = response.choices[0]?.message?.content;
  if (!responseText) throw new Error("Grok failed to return data");

  return JSON.parse(responseText);
};