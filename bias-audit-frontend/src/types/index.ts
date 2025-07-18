export interface LLMModel {
  id: string;
  name: string;
  description: string;
}

export interface PerformanceMetric {
  id: string;
  name: string;
  description: string;
  applicableTypes: ('binary' | 'continuous')[];
}

export interface Variation {
  id: string;
  name: string;
  description: string;
  magnitudeRange: [number, number];
  defaultMagnitude: number;
}

export interface AuditStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  current: boolean;
}

export interface AuditState {
  // Step 1: Data Upload & LLM Setup
  uploadedFile: File | null;
  filePreview: string | null;
  selectedLLM: LLMModel | null;
  outcomeType: 'binary' | 'continuous' | null;
  selectedMetric: PerformanceMetric | null;
  initialPerformance: number | null;
  performanceSatisfactory: boolean | null;
  customModelFile?: File | null;
  aiPrompt?: string;
  rubric?: string;
  sessionId?: string;  // Backend session ID for CSV access
  
  // Step 2: Data Filtering
  useScoreCutoff: boolean | null;
  cutoffScore: number | null;
  selectedVariations: Variation[];
  
  // Step 3: Validation
  variationsValid: boolean | null;
  sampledVariations?: any[];  // Store sampled variations for display
  
  // Step 4: Additional Measures
  useAdditionalMeasures: boolean | null;
  selectedMeasures: string[];
  useHigherMoments: boolean | null;
  selectedMoments: string[];
  
  // Step 5: Magnitudes
  variationMagnitudes: Record<string, number>;
  
  // Step 6: Grouping
  useGrouping: boolean | null;
  groupingVariable: string | null;
  notificationEmail?: string | null;
  
  // Results
  auditResults: any | null;
  currentStep: number;
}

export interface AuditResult {
  variation: string;
  magnitude: number;
  originalGrade: number;
  perturbedGrade: number;
  difference: number;
  biasMeasures: {
    bias_0: number;
    bias_1: number;
    bias_2: number;
    bias_3: number;
  };
  group?: string;
} 