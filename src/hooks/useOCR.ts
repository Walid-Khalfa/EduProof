import { ocrWithPuter, type OcrResult } from "@/services/ocrPuter";

export type { OcrResult };

export function useOCR() {
  const provider = import.meta.env.VITE_OCR_PROVIDER ?? "gemini";

  return async function runOCR(file: File): Promise<OcrResult> {
    // Try Puter first if configured
    if (provider === "puter") {
      try {
        return await ocrWithPuter(file);
      } catch (error: any) {
        console.warn("Puter OCR failed, falling back to server:", error);
        // If Puter fails, fall through to server
      }
    }

    // Use server Gemini endpoint (primary or fallback)
    const formData = new FormData();
    formData.append("file", file);
    
    const apiUrl = import.meta.env.VITE_API_URL || "";
    
    try {
      const response = await fetch(`${apiUrl}/api/ocr`, {
        method: "POST",
        body: formData,
      });

      const text = await response.text();
      let payload: any = {};
      
      try { 
        payload = text ? JSON.parse(text) : {}; 
      } catch (e) {
        console.error('Failed to parse response as JSON:', text);
        throw new Error('Invalid response from OCR service. Please try again.');
      }
      
      if (!response.ok) {
        // Extract detailed error information
        const errorMsg = payload?.error || payload?.message || 'OCR processing failed';
        const details = payload?.details;
        
        console.error('OCR error details:', {
          status: response.status,
          error: errorMsg,
          details,
          payload,
          rawText: text.substring(0, 500)
        });
        
        // Provide user-friendly error messages
        if (response.status === 502 || response.status === 503) {
          throw new Error('OCR service temporarily unavailable. Please try again in a moment.');
        }
        if (response.status === 415) {
          throw new Error('Unsupported file type. Please upload a PNG, JPG, or PDF image.');
        }
        if (response.status === 413) {
          throw new Error('File too large. Please upload an image smaller than 15MB.');
        }
        
        throw new Error(`OCR failed: ${errorMsg}`);
      }
      
      // Validate response structure
      if (!payload.student_name && !payload.course_name && !payload.institution) {
        throw new Error('No data extracted from certificate. Please ensure the image is clear and contains certificate information.');
      }
      
      return payload;
    } catch (error: any) {
      // Network or fetch errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Unable to connect to OCR service. Please check your connection and try again.');
      }
      // Re-throw our custom errors
      throw error;
    }
  };
}
