# AI-OCR Integration Guide for EduProof

## Overview

This guide covers AI-powered OCR (Optical Character Recognition) integration for extracting text from certificate images in the EduProof dApp. We'll explore OpenAI Vision API, alternative OCR services, and field extraction patterns.

---

## Table of Contents

1. [OpenAI Vision API](#openai-vision-api)
2. [Alternative OCR Services](#alternative-ocr-services)
3. [Service Comparison](#service-comparison)
4. [Confidence Scoring](#confidence-scoring)
5. [Field Extraction Patterns](#field-extraction-patterns)
6. [Implementation Examples](#implementation-examples)

---

## OpenAI Vision API

### Overview

OpenAI's GPT-4 Vision (GPT-4V) provides advanced image understanding and text extraction capabilities, ideal for certificate OCR.

### Key Features

- **High Accuracy**: Superior text recognition, including handwritten text
- **Context Understanding**: Can interpret certificate structure and extract specific fields
- **Multi-language Support**: Supports 50+ languages
- **Structured Output**: Can return JSON-formatted data

### Setup

```bash
# Install OpenAI SDK
npm install openai
```

```bash
# Environment variables
OPENAI_API_KEY=sk-your-api-key-here
```

### Basic Implementation

```typescript
// lib/ocr/openai.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function extractTextFromImage(
  imageBase64: string,
  mimeType: string = 'image/png'
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-vision-preview',
    messages: [
      {
        role: 'system',
        content: 'You are an expert OCR assistant specialized in extracting text from educational certificates.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extract all text from this certificate image. Return the text exactly as it appears.',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
            },
          },
        ],
      },
    ],
    max_tokens: 1000,
  });

  return response.choices[0].message.content || '';
}
```

### Structured Field Extraction

```typescript
// lib/ocr/extractCertificateFields.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface CertificateFields {
  studentName: string;
  institutionName: string;
  degree: string;
  major?: string;
  graduationDate: string;
  gpa?: string;
  honors?: string;
  certificateNumber?: string;
  confidence: number;
}

export async function extractCertificateFields(
  imageBase64: string,
  mimeType: string = 'image/png'
): Promise<CertificateFields> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-vision-preview',
    messages: [
      {
        role: 'system',
        content: `You are an expert at extracting structured data from educational certificates. 
        Extract the following fields and return them as JSON:
        - studentName: Full name of the student
        - institutionName: Name of the educational institution
        - degree: Type of degree (e.g., Bachelor of Science, Master of Arts)
        - major: Field of study (if mentioned)
        - graduationDate: Date of graduation (format: YYYY-MM-DD if possible)
        - gpa: Grade Point Average (if mentioned)
        - honors: Any honors or distinctions (if mentioned)
        - certificateNumber: Certificate or diploma number (if visible)
        - confidence: Your confidence level in the extraction (0-100)
        
        If a field is not found, use null. Return only valid JSON.`,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extract certificate fields from this image and return as JSON.',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
            },
          },
        ],
      },
    ],
    max_tokens: 500,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content || '{}';
  return JSON.parse(content);
}
```

### API Route Implementation

```typescript
// app/api/ocr/extract/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { extractCertificateFields } from '@/lib/ocr/extractCertificateFields';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert file to base64
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');

    // Extract fields
    const fields = await extractCertificateFields(base64, file.type);

    return NextResponse.json({
      success: true,
      fields,
    });

  } catch (error) {
    console.error('OCR extraction error:', error);
    return NextResponse.json(
      { error: 'Extraction failed' },
      { status: 500 }
    );
  }
}
```

### Cost Considerations

**OpenAI Vision Pricing (2024):**
- Input: ~$0.01 per image (varies by resolution)
- Output: ~$0.03 per 1K tokens

**Optimization Tips:**
1. Resize images before sending (max 2048px)
2. Use lower resolution for initial validation
3. Cache results to avoid duplicate processing
4. Implement rate limiting

---

## Alternative OCR Services

### 1. Tesseract.js (Open Source)

**Pros:**
- Free and open source
- Runs in browser (client-side)
- No API costs
- Privacy-friendly (no data sent to servers)

**Cons:**
- Lower accuracy (WER: 5.8%)
- Limited handwriting recognition
- Requires more processing power

**Implementation:**

```typescript
// lib/ocr/tesseract.ts
import Tesseract from 'tesseract.js';

export async function extractTextWithTesseract(
  imageFile: File
): Promise<{ text: string; confidence: number }> {
  const worker = await Tesseract.createWorker();
  
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  
  const { data } = await worker.recognize(imageFile);
  
  await worker.terminate();
  
  return {
    text: data.text,
    confidence: data.confidence,
  };
}
```

**Client-Side Component:**

```typescript
'use client';

import { useState } from 'react';
import { extractTextWithTesseract } from '@/lib/ocr/tesseract';

export default function TesseractOCR() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const result = await extractTextWithTesseract(file);
      setText(result.text);
      console.log('Confidence:', result.confidence);
    } catch (error) {
      console.error('OCR failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileSelect} accept="image/*" />
      {loading && <p>Processing...</p>}
      {text && <pre>{text}</pre>}
    </div>
  );
}
```

### 2. Google Cloud Vision API

**Pros:**
- High accuracy (WER: 2.0%)
- Excellent handwriting recognition
- 200+ language support
- Advanced layout analysis

**Cons:**
- Requires Google Cloud account
- API costs ($1.50 per 1,000 images)
- More complex setup

**Implementation:**

```typescript
// lib/ocr/googleVision.ts
import vision from '@google-cloud/vision';

const client = new vision.ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

export async function extractTextWithGoogleVision(
  imageBuffer: Buffer
): Promise<{ text: string; confidence: number }> {
  const [result] = await client.textDetection(imageBuffer);
  const detections = result.textAnnotations || [];
  
  if (detections.length === 0) {
    return { text: '', confidence: 0 };
  }

  // First annotation contains full text
  const fullText = detections[0].description || '';
  
  // Calculate average confidence
  const confidences = detections
    .slice(1)
    .map(d => d.confidence || 0);
  const avgConfidence = confidences.length > 0
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length
    : 0;

  return {
    text: fullText,
    confidence: avgConfidence * 100,
  };
}
```

### 3. AWS Textract

**Pros:**
- Advanced form and table extraction
- Good accuracy (WER: 2.8%)
- Integrates well with AWS ecosystem
- Structured data extraction

**Cons:**
- Limited language support (6 languages)
- AWS account required
- Complex pricing model

**Implementation:**

```typescript
// lib/ocr/awsTextract.ts
import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';

const client = new TextractClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function extractTextWithTextract(
  imageBuffer: Buffer
): Promise<{ text: string; blocks: any[] }> {
  const command = new DetectDocumentTextCommand({
    Document: {
      Bytes: imageBuffer,
    },
  });

  const response = await client.send(command);
  const blocks = response.Blocks || [];

  // Extract text from LINE blocks
  const text = blocks
    .filter(block => block.BlockType === 'LINE')
    .map(block => block.Text)
    .join('\n');

  return { text, blocks };
}
```

---

## Service Comparison

### Accuracy Comparison (2024)

| Service | Word Error Rate (WER) | Handwriting | Languages | Cost |
|---------|----------------------|-------------|-----------|------|
| Google Cloud Vision | 2.0% | Excellent | 200+ | $1.50/1K |
| AWS Textract | 2.8% | Good | 6 | $0.05-0.015/page |
| OpenAI Vision | ~2.5% | Excellent | 50+ | ~$0.01/image |
| Tesseract.js | 5.8% | Limited | 100+ | Free |

### Use Case Recommendations

**Choose OpenAI Vision if:**
- Need structured field extraction
- Want context-aware processing
- Require multi-language support
- Budget allows API costs

**Choose Google Cloud Vision if:**
- Need highest accuracy
- Extensive language support required
- Already using Google Cloud

**Choose AWS Textract if:**
- Need form/table extraction
- Already using AWS ecosystem
- Processing structured documents

**Choose Tesseract.js if:**
- Budget is tight
- Privacy is critical (client-side processing)
- Simple text extraction is sufficient
- Offline capability needed

---

## Confidence Scoring

### Implementing Confidence Thresholds

```typescript
// lib/ocr/confidenceScoring.ts
export interface OCRResult {
  text: string;
  confidence: number;
  fields?: Record<string, any>;
}

export enum ConfidenceLevel {
  HIGH = 'high',      // >= 90%
  MEDIUM = 'medium',  // 70-89%
  LOW = 'low',        // < 70%
}

export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 90) return ConfidenceLevel.HIGH;
  if (confidence >= 70) return ConfidenceLevel.MEDIUM;
  return ConfidenceLevel.LOW;
}

export function shouldRequireManualReview(result: OCRResult): boolean {
  return result.confidence < 70;
}

export function validateExtractedFields(
  fields: Record<string, any>,
  requiredFields: string[]
): { valid: boolean; missingFields: string[] } {
  const missingFields = requiredFields.filter(
    field => !fields[field] || fields[field] === null
  );

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}
```

### Multi-Service Consensus

```typescript
// lib/ocr/consensus.ts
export async function extractWithConsensus(
  imageBuffer: Buffer
): Promise<OCRResult> {
  // Run multiple OCR services in parallel
  const [openaiResult, googleResult] = await Promise.all([
    extractWithOpenAI(imageBuffer),
    extractWithGoogleVision(imageBuffer),
  ]);

  // Calculate consensus confidence
  const avgConfidence = (openaiResult.confidence + googleResult.confidence) / 2;

  // Use result with higher confidence
  const bestResult = openaiResult.confidence > googleResult.confidence
    ? openaiResult
    : googleResult;

  return {
    ...bestResult,
    confidence: avgConfidence,
  };
}
```

---

## Field Extraction Patterns

### Certificate Field Patterns

```typescript
// lib/ocr/patterns.ts
export const CERTIFICATE_PATTERNS = {
  studentName: {
    keywords: ['awarded to', 'presented to', 'this certifies that', 'name:'],
    regex: /(?:awarded to|presented to|this certifies that)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
  },
  
  degree: {
    keywords: ['bachelor', 'master', 'doctor', 'phd', 'diploma', 'certificate'],
    regex: /(Bachelor|Master|Doctor|PhD|Diploma|Certificate)\s+(?:of\s+)?([A-Za-z\s]+)/i,
  },
  
  institution: {
    keywords: ['university', 'college', 'institute', 'school'],
    regex: /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:University|College|Institute|School))/,
  },
  
  date: {
    keywords: ['date', 'dated', 'issued on', 'graduation date'],
    regex: /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})/i,
  },
  
  gpa: {
    keywords: ['gpa', 'grade point average', 'cgpa'],
    regex: /(?:GPA|CGPA|Grade Point Average)[:\s]+(\d+\.\d+)/i,
  },
  
  honors: {
    keywords: ['cum laude', 'magna cum laude', 'summa cum laude', 'with honors', 'with distinction'],
    regex: /(Summa Cum Laude|Magna Cum Laude|Cum Laude|With Honors|With Distinction)/i,
  },
};

export function extractFieldWithPattern(
  text: string,
  pattern: { keywords: string[]; regex: RegExp }
): string | null {
  // Check if any keyword is present
  const hasKeyword = pattern.keywords.some(keyword =>
    text.toLowerCase().includes(keyword.toLowerCase())
  );

  if (!hasKeyword) return null;

  // Try to extract with regex
  const match = text.match(pattern.regex);
  return match ? match[1].trim() : null;
}
```

### Smart Field Extraction

```typescript
// lib/ocr/smartExtraction.ts
import { CERTIFICATE_PATTERNS, extractFieldWithPattern } from './patterns';

export interface ExtractedCertificateData {
  studentName: string | null;
  degree: string | null;
  institution: string | null;
  graduationDate: string | null;
  gpa: string | null;
  honors: string | null;
  confidence: number;
}

export function extractCertificateData(
  ocrText: string,
  confidence: number
): ExtractedCertificateData {
  return {
    studentName: extractFieldWithPattern(ocrText, CERTIFICATE_PATTERNS.studentName),
    degree: extractFieldWithPattern(ocrText, CERTIFICATE_PATTERNS.degree),
    institution: extractFieldWithPattern(ocrText, CERTIFICATE_PATTERNS.institution),
    graduationDate: extractFieldWithPattern(ocrText, CERTIFICATE_PATTERNS.date),
    gpa: extractFieldWithPattern(ocrText, CERTIFICATE_PATTERNS.gpa),
    honors: extractFieldWithPattern(ocrText, CERTIFICATE_PATTERNS.honors),
    confidence,
  };
}
```

### Validation and Correction

```typescript
// lib/ocr/validation.ts
export function validateStudentName(name: string | null): boolean {
  if (!name) return false;
  
  // Check if name has at least 2 parts (first and last name)
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return false;
  
  // Check if each part starts with capital letter
  return parts.every(part => /^[A-Z]/.test(part));
}

export function validateDate(dateStr: string | null): boolean {
  if (!dateStr) return false;
  
  const date = new Date(dateStr);
  const now = new Date();
  
  // Date should be valid and not in the future
  return !isNaN(date.getTime()) && date <= now;
}

export function validateGPA(gpa: string | null): boolean {
  if (!gpa) return false;
  
  const gpaNum = parseFloat(gpa);
  
  // GPA should be between 0 and 4.0 (or 5.0 for some systems)
  return !isNaN(gpaNum) && gpaNum >= 0 && gpaNum <= 5.0;
}

export function validateExtractedData(
  data: ExtractedCertificateData
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!validateStudentName(data.studentName)) {
    errors.push('Invalid student name format');
  }

  if (!validateDate(data.graduationDate)) {
    errors.push('Invalid graduation date');
  }

  if (data.gpa && !validateGPA(data.gpa)) {
    errors.push('Invalid GPA value');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

---

## Implementation Examples

### Complete OCR Flow

```typescript
// app/actions/processCertificate.ts
'use server';

import { extractCertificateFields } from '@/lib/ocr/extractCertificateFields';
import { extractCertificateData } from '@/lib/ocr/smartExtraction';
import { validateExtractedData } from '@/lib/ocr/validation';
import { getConfidenceLevel, shouldRequireManualReview } from '@/lib/ocr/confidenceScoring';

export async function processCertificateImage(imageBase64: string) {
  // Step 1: Extract fields using AI
  const aiFields = await extractCertificateFields(imageBase64);
  
  // Step 2: Determine confidence level
  const confidenceLevel = getConfidenceLevel(aiFields.confidence);
  
  // Step 3: Validate extracted data
  const validation = validateExtractedData(aiFields as any);
  
  // Step 4: Determine if manual review is needed
  const needsReview = shouldRequireManualReview({
    text: '',
    confidence: aiFields.confidence,
    fields: aiFields,
  });

  return {
    fields: aiFields,
    confidence: aiFields.confidence,
    confidenceLevel,
    validation,
    needsReview,
  };
}
```

### Client Component with OCR

```typescript
'use client';

import { useState } from 'react';
import { processCertificateImage } from '@/app/actions/processCertificate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function CertificateOCR() {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);

    try {
      // Convert to base64
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');

      // Process with OCR
      const ocrResult = await processCertificateImage(base64);
      setResult(ocrResult);

    } catch (error) {
      console.error('OCR failed:', error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        type="file"
        onChange={handleFileSelect}
        accept="image/*,.pdf"
        disabled={processing}
      />

      {processing && <p>Processing certificate...</p>}

      {result && (
        <div className="space-y-2">
          <h3>Extracted Fields:</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>Student: {result.fields.studentName}</div>
            <div>Institution: {result.fields.institutionName}</div>
            <div>Degree: {result.fields.degree}</div>
            <div>Date: {result.fields.graduationDate}</div>
          </div>
          
          <div className="mt-4">
            <p>Confidence: {result.confidence}% ({result.confidenceLevel})</p>
            {result.needsReview && (
              <p className="text-yellow-600">⚠️ Manual review recommended</p>
            )}
          </div>

          {!result.validation.valid && (
            <div className="text-red-600">
              <p>Validation errors:</p>
              <ul>
                {result.validation.errors.map((error: string, i: number) => (
                  <li key={i}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Best Practices

### 1. Image Preprocessing

```typescript
// lib/ocr/preprocessing.ts
import sharp from 'sharp';

export async function preprocessImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
    .grayscale()
    .normalize()
    .sharpen()
    .toBuffer();
}
```

### 2. Caching Results

```typescript
// lib/ocr/cache.ts
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function getCachedOCR(imageHash: string) {
  return redis.get(`ocr:${imageHash}`);
}

export async function cacheOCR(imageHash: string, result: any) {
  await redis.set(`ocr:${imageHash}`, result, { ex: 86400 }); // 24h TTL
}
```

### 3. Error Handling

```typescript
export async function extractWithRetry(
  imageBase64: string,
  maxRetries: number = 3
): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await extractCertificateFields(imageBase64);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

---

## References

- [OpenAI Vision API Documentation](https://platform.openai.com/docs/guides/vision)
- [Google Cloud Vision API](https://cloud.google.com/vision/docs)
- [AWS Textract Documentation](https://docs.aws.amazon.com/textract/)
- [Tesseract.js GitHub](https://github.com/naptha/tesseract.js)
