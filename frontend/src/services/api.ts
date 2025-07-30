import axios from 'axios';
import { AuditState, AuditResult } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface AuditRequest {
  auditState: AuditState;
  data?: File;
  modelScript?: File;
}

export interface AuditResponse {
  sessionId: string;
  status: string;
  results: AuditResult[];
  summary: {
    totalVariations: number;
    averageGradeChange: number;
    maxBiasMeasure: number;
    groupsAnalyzed: number;
  };
  moments?: any[];
}

export const auditAPI = {
  // Start a new audit
  startAudit: async (request: AuditRequest): Promise<AuditResponse> => {
    const formData = new FormData();
    formData.append('auditState', JSON.stringify(request.auditState));
    
    if (request.data) {
      formData.append('data', request.data);
    }
    
    if (request.modelScript) {
      formData.append('modelScript', request.modelScript);
    }

    const response = await api.post('/api/audit', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },

  // Get available variations
  getVariations: async () => {
    const response = await api.get('/api/variations');
    return response.data;
  },

  // Preview a variation
  previewVariation: async (variationName: string, magnitude: number, nSamples: number = 5) => {
    const response = await api.post('/api/preview', {
      variationName,
      magnitude,
      nSamples,
    });
    return response.data;
  },

  // Get audit results
  getResults: async (auditId: string): Promise<AuditResponse> => {
    const response = await api.get(`/api/results/${auditId}`);
    return response.data;
  },

  // Download results as CSV
  downloadResults: async (auditId: string): Promise<Blob> => {
    const response = await api.get(`/api/download/${auditId}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  assessPerformance: async (params: {
    csvFile: File;
    modelType: string;
    aiPrompt?: string;
    rubric?: string;
    metric?: string;
    customModelFile?: File;
  }) => {
    const formData = new FormData();
    formData.append('csv_file', params.csvFile);
    formData.append('model_type', params.modelType);
    if (params.aiPrompt) formData.append('ai_prompt', params.aiPrompt);
    if (params.rubric) formData.append('rubric', params.rubric);
    if (params.metric) formData.append('metric', params.metric);
    if (params.customModelFile) formData.append('custom_model_file', params.customModelFile);

    const response = await api.post('/api/assess_performance', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Sample variations from uploaded CSV
  sampleVariations: async (params: {
    sessionId: string;
    variationTypes: string[];
    sampleSize?: number;
    magnitude?: number;
  }) => {
    const response = await api.post('/api/sample-variations', {
      session_id: params.sessionId,
      variation_types: params.variationTypes,
      sample_size: params.sampleSize || 5,
      magnitude: params.magnitude || 50,
    });
    return response.data;
  },

  // Preview audit results for 5 sample texts
  previewAudit: async (params: {
    sessionId: string;
    sampleTexts: string[];
    variation: string;
    magnitude: number;
  }) => {
    const response = await api.post('/api/preview_audit', {
      session_id: params.sessionId,
      sample_texts: params.sampleTexts,
      variation: params.variation,
      magnitude: params.magnitude,
    });
    return response.data;
  },

  createSession: async (params: {
    csvFile: File;
    modelType: string;
    aiPrompt?: string;
    rubric?: string;
    customModelFile?: File;
  }) => {
    const formData = new FormData();
    formData.append('csv_file', params.csvFile);
    formData.append('model_type', params.modelType);
    if (params.aiPrompt) formData.append('ai_prompt', params.aiPrompt);
    if (params.rubric) formData.append('rubric', params.rubric);
    if (params.customModelFile) formData.append('custom_model_file', params.customModelFile);

    const response = await api.post('/api/create_session', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default api; 