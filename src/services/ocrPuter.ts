import { loadPuter } from "@/lib/puter";
import { fileToDataUrl } from "@/lib/file";

const MODEL = "Qwen/Qwen2.5-VL-72B-Instruct";

const SYSTEM = `You are an OCR & information extraction assistant for academic certificates.
Return STRICT JSON ONLY with this exact schema:
{
  "student_name": string,
  "course_name": string,
  "institution": string,
  "issue_date": string,
  "fields_confidence": {
    "student_name": number,
    "course_name": number,
    "institution": number,
    "issue_date": number
  },
  "verification_notes": string
}`;

const USER = `Extract fields from the provided certificate image. 
If a field is missing: use "" and confidence 0.0. Prefer YYYY-MM-DD for dates.`;

export interface OcrResult {
  student_name: string;
  course_name: string;
  institution: string;
  issue_date: string;
  fields_confidence: Record<string, number>;
  verification_notes: string;
  verification_score: number;
}

export async function ocrWithPuter(file: File): Promise<OcrResult> {
  const puter = await loadPuter();
  const dataUrl = await fileToDataUrl(file);

  const raw = await puter.ai.chat(
    USER,
    dataUrl,
    { 
      model: MODEL, 
      system: SYSTEM, 
      temperature: 0.2, 
      max_tokens: 512 
    }
  );

  const text = String(raw);
  const startIndex = text.indexOf("{");
  const endIndex = text.lastIndexOf("}");
  
  if (startIndex === -1 || endIndex === -1) {
    throw new Error("OCR output is not JSON");
  }
  
  const data = JSON.parse(text.slice(startIndex, endIndex + 1));
  const fieldsConfidence = data.fields_confidence || {};
  
  const score = (
    ["student_name", "course_name", "institution", "issue_date"]
      .map(key => Number(fieldsConfidence[key] ?? 0))
      .reduce((a, b) => a + b, 0) / 4
  ) * 100;

  return {
    ...data,
    verification_score: Math.round(score)
  };
}
