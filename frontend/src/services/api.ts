import axios from 'axios';
import {
  HealthStatus,
  ModelStatus,
  DashboardSummary,
  AnalysisListItem,
  AnalysisDetail,
  FlawItem,
  DatasetSample,
  ValidationReport,
  SettingsData,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 45000,
});

export const getHealth = async (): Promise<HealthStatus> => {
  const res = await api.get('/health');
  return res.data;
};

export const getModelStatus = async (): Promise<ModelStatus> => {
  const res = await api.get('/health/models');
  return res.data;
};

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const res = await api.get('/dashboard/summary');
  return res.data;
};

export const listAnalyses = async (category?: string, status?: string): Promise<AnalysisListItem[]> => {
  const res = await api.get('/analyses', { params: { category, status } });
  return res.data;
};

export const getAnalysisDetail = async (id: string): Promise<AnalysisDetail> => {
  const res = await api.get(`/analyses/${id}`);
  return res.data;
};

export const getAnalysisStatus = async (id: string): Promise<{ id: string; status: string; overall_score?: number; error_message?: string }> => {
  const res = await api.get(`/analyses/${id}/status`);
  return res.data;
};

export const getAnalysisFlaws = async (id: string): Promise<FlawItem[]> => {
  const res = await api.get(`/analyses/${id}/flaws`);
  return res.data;
};

export const createAnalysis = async (formData: FormData): Promise<{ analysis_id: string; status: string }> => {
  const res = await api.post('/analyses', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const loadSampleAnalysis = async (sampleKey: string = 'script_1'): Promise<{ analysis_id: string; status: string; overall_score: number }> => {
  const res = await api.post(`/analyses/sample?sample_key=${sampleKey}`);
  return res.data;
};

export const deleteAnalysis = async (id: string): Promise<{ deleted: boolean }> => {
  const res = await api.delete(`/analyses/${id}`);
  return res.data;
};

export const getExportUrl = (id: string, format: 'json' | 'csv'): string => {
  return `/api/analyses/${id}/report?format=${format}`;
};

export const getAudioStreamUrl = (analysisId: string, role: 'participant' | 'reference'): string => {
  return `/api/analyses/${analysisId}/audio/${role}`;
};

// Dataset
export const listDatasetSamples = async (split?: string): Promise<DatasetSample[]> => {
  const res = await api.get('/dataset/samples', { params: { split } });
  return res.data;
};

export const createDatasetSample = async (data: any): Promise<DatasetSample> => {
  const res = await api.post('/dataset/samples', data);
  return res.data;
};

export const addHumanAnnotation = async (data: any): Promise<any> => {
  const res = await api.post('/dataset/annotations', data);
  return res.data;
};

export const getDatasetSummary = async (): Promise<any> => {
  const res = await api.get('/dataset/summary');
  return res.data;
};

export const validateModel = async (iouThreshold: number = 0.30): Promise<ValidationReport> => {
  const res = await api.post(`/evaluation/validate?iou_threshold=${iouThreshold}`);
  return res.data;
};

// Settings
export const getSettings = async (): Promise<SettingsData> => {
  const res = await api.get('/settings');
  return res.data;
};

export const updateSettings = async (data: Partial<SettingsData>): Promise<SettingsData> => {
  const res = await api.post('/settings', data);
  return res.data;
};
