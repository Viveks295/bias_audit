import axios from 'axios';
import { AuditState, AuditResult } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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
  results: AuditResult[];
  summary: {
    totalVariations: number;
    averageGradeChange: number;
    maxBiasMeasure: number;
    groupsAnalyzed: number;
  };
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

    const response = await api.post('/audit', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },

  // Get available variations
  getVariations: async () => {
    const response = await api.get('/variations');
    return response.data;
  },

  // Preview a variation
  previewVariation: async (variationName: string, magnitude: number, nSamples: number = 5) => {
    const response = await api.post('/preview', {
      variationName,
      magnitude,
      nSamples,
    });
    return response.data;
  },

  // Get audit results
  getResults: async (auditId: string): Promise<AuditResponse> => {
    const response = await api.get(`/results/${auditId}`);
    return response.data;
  },

  // Download results as CSV
  downloadResults: async (auditId: string): Promise<Blob> => {
    const response = await api.get(`/download/${auditId}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default api; 