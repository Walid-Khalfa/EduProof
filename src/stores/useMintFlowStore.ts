import { create } from 'zustand';

export type StepKey = 'ocr' | 'validation' | 'ipfs' | 'mint' | 'index';
export type StepStatus = 'idle' | 'active' | 'done' | 'error';

export interface StepState {
  status: StepStatus;
  meta?: any;
}

export interface MintFlowFields {
  studentName: string;
  courseName: string;
  institution: string;
  issueDate: string;
}

export interface MintFlowChecks {
  hasImage: boolean;
  walletConnected: boolean;
  institutionOk: boolean;
  ocrConfidence: boolean;
  onSepolia: boolean;
}

export interface MintFlowState {
  // Steps tracking
  steps: Record<StepKey, StepState>;
  setStep: (key: StepKey, state: StepState) => void;
  
  // Form data
  file: File | null;
  previewUrl: string | null;
  fields: MintFlowFields;
  setField: (key: keyof MintFlowFields, value: string) => void;
  setFile: (file: File | null) => void;
  
  // PDF support
  isPdf: boolean;
  pdfPages: number | null;
  pdfPreviewCid: string | null;
  setPdfMetadata: (isPdf: boolean, pages?: number, previewCid?: string) => void;
  
  // Pre-flight checks
  checks: MintFlowChecks;
  setCheck: (key: keyof MintFlowChecks, value: boolean) => void;
  
  // OCR data
  ocrResult: any | null;
  verificationScore: number | null;
  verificationUrl: string | null;
  setOcrResult: (result: any, score: number) => void;
  
  // Confirmation flag
  fieldsConfirmed: boolean;
  setFieldsConfirmed: (confirmed: boolean) => void;
  
  // Reset everything
  resetFlow: () => void;
}

const initialFields: MintFlowFields = {
  studentName: '',
  courseName: '',
  institution: '',
  issueDate: '',
};

const initialChecks: MintFlowChecks = {
  hasImage: false,
  walletConnected: false,
  institutionOk: false,
  ocrConfidence: false,
  onSepolia: false,
};

const initialSteps: Record<StepKey, StepState> = {
  ocr: { status: 'idle' },
  validation: { status: 'idle' },
  ipfs: { status: 'idle' },
  mint: { status: 'idle' },
  index: { status: 'idle' },
};

export const useMintFlowStore = create<MintFlowState>((set, get) => ({
  // Initial state
  steps: initialSteps,
  file: null,
  previewUrl: null,
  fields: initialFields,
  checks: initialChecks,
  ocrResult: null,
  verificationScore: null,
  verificationUrl: null,
  fieldsConfirmed: false,
  isPdf: false,
  pdfPages: null,
  pdfPreviewCid: null,
  
  // Actions
  setStep: (key, state) => 
    set((prev) => ({
      steps: { ...prev.steps, [key]: state },
    })),
  
  setField: (key, value) =>
    set((prev) => ({
      fields: { ...prev.fields, [key]: value },
    })),
  
  setFile: (file) => {
    const state = get();
    
    // Revoke old preview URL if exists
    if (state.previewUrl) {
      URL.revokeObjectURL(state.previewUrl);
    }
    
    // Create new preview URL if file exists
    const previewUrl = file ? URL.createObjectURL(file) : null;
    
    set({ file, previewUrl });
  },
  
  setCheck: (key, value) =>
    set((prev) => ({
      checks: { ...prev.checks, [key]: value },
    })),
  
  setOcrResult: (result, score) =>
    set({ 
      ocrResult: result, 
      verificationScore: score,
      verificationUrl: result?.verification_url || null
    }),
  
  setFieldsConfirmed: (confirmed) =>
    set({ fieldsConfirmed: confirmed }),
  
  setPdfMetadata: (isPdf, pages, previewCid) =>
    set({ 
      isPdf, 
      pdfPages: pages ?? null, 
      pdfPreviewCid: previewCid ?? null 
    }),
  
  resetFlow: () => {
    const state = get();
    
    // Revoke preview URL
    if (state.previewUrl) {
      URL.revokeObjectURL(state.previewUrl);
    }
    
    // Reset to initial state (preserve wallet/network checks)
    set({
      steps: initialSteps,
      file: null,
      previewUrl: null,
      fields: initialFields,
      checks: {
        ...initialChecks,
        walletConnected: state.checks.walletConnected,
        onSepolia: state.checks.onSepolia,
      },
      ocrResult: null,
      verificationScore: null,
      verificationUrl: null,
      fieldsConfirmed: false,
      isPdf: false,
      pdfPages: null,
      pdfPreviewCid: null,
    });
  },
}));
