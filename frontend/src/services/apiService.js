import axios from 'axios';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
const API_TIMEOUT = 30000; // 30 seconds

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor for adding auth tokens and logging
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request ID for tracking
    config.headers['X-Request-ID'] = generateRequestId();
    
    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        data: config.data,
        headers: config.headers,
      });
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling responses and errors
apiClient.interceptors.response.use(
  (response) => {
    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ API Response:', {
        status: response.status,
        url: response.config.url,
        data: response.data,
      });
    }
    
    return response;
  },
  (error) => {
    // Handle different error types
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      console.error('❌ API Error Response:', {
        status,
        url: error.config?.url,
        data,
      });
      
      // Handle specific status codes
      switch (status) {
        case 401:
          // Unauthorized - clear auth and redirect to login
          localStorage.removeItem('authToken');
          localStorage.removeItem('userRole');
          window.location.href = '/login';
          break;
        case 403:
          // Forbidden
          console.warn('🚫 Access forbidden');
          break;
        case 429:
          // Rate limited
          console.warn('⏰ Rate limited - please slow down');
          break;
        case 500:
          // Server error
          console.error('🔥 Server error');
          break;
        default:
          console.error(`❌ HTTP ${status} Error`);
      }
    } else if (error.request) {
      // Network error
      console.error('🌐 Network Error:', error.message);
    } else {
      // Other error
      console.error('❌ Unknown Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Utility function to generate request ID
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// API Service Class
class ApiService {
  // System Health and Status
  async getSystemHealth() {
    try {
      const response = await apiClient.get('/health');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get system health');
    }
  }

  async getSystemStatus() {
    try {
      const response = await apiClient.get('/status');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get system status');
    }
  }

  // Constituency Level APIs
  async getConstituencyVotes(constituencyId) {
    try {
      const response = await apiClient.get(`/constituency/${constituencyId}/votes`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get constituency votes');
    }
  }

  async submitConstituencyVote(constituencyId, voteData) {
    try {
      const response = await apiClient.post(`/constituency/${constituencyId}/vote`, voteData);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to submit constituency vote');
    }
  }

  async getConstituencyResults(constituencyId) {
    try {
      const response = await apiClient.get(`/constituency/${constituencyId}/results`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get constituency results');
    }
  }

  async getConstituencyCandidates(constituencyId) {
    try {
      const response = await apiClient.get(`/constituency/${constituencyId}/candidates`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get constituency candidates');
    }
  }

  // Division Level APIs
  async getDivisionRollup(divisionId) {
    try {
      const response = await apiClient.get(`/division/${divisionId}/rollup`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get division rollup');
    }
  }

  async getDivisionResults(divisionId) {
    try {
      const response = await apiClient.get(`/division/${divisionId}/results`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get division results');
    }
  }

  async processDivisionBatch(divisionId, batchData) {
    try {
      const response = await apiClient.post(`/division/${divisionId}/batch`, batchData);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to process division batch');
    }
  }

  // National Level APIs
  async getNationalTally() {
    try {
      const response = await apiClient.get('/national/tally');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get national tally');
    }
  }

  async getNationalResults() {
    try {
      const response = await apiClient.get('/national/results');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get national results');
    }
  }

  async finalizeNationalResults() {
    try {
      const response = await apiClient.post('/national/finalize');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to finalize national results');
    }
  }

  // Energy Monitoring APIs
  async getEnergyMetrics() {
    try {
      const response = await apiClient.get('/energy/metrics');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get energy metrics');
    }
  }

  async getEnergyReport(startDate, endDate) {
    try {
      const response = await apiClient.get('/energy/report', {
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get energy report');
    }
  }

  async getCarbonFootprint() {
    try {
      const response = await apiClient.get('/energy/carbon-footprint');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get carbon footprint');
    }
  }

  async getEnergyComparison() {
    try {
      const response = await apiClient.get('/energy/comparison');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get energy comparison');
    }
  }

  // Audit Trail APIs
  async getAuditLogs(filters = {}) {
    try {
      const response = await apiClient.get('/audit/logs', { params: filters });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get audit logs');
    }
  }

  async getAuditReport(reportType, params = {}) {
    try {
      const response = await apiClient.get(`/audit/report/${reportType}`, { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get audit report');
    }
  }

  async verifyTransaction(transactionHash) {
    try {
      const response = await apiClient.get(`/audit/verify/${transactionHash}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to verify transaction');
    }
  }

  // Voter Management APIs
  async registerVoter(voterData) {
    try {
      const response = await apiClient.post('/voters/register', voterData);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to register voter');
    }
  }

  async verifyVoter(voterId) {
    try {
      const response = await apiClient.get(`/voters/${voterId}/verify`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to verify voter');
    }
  }

  async getVoterStatus(voterId) {
    try {
      const response = await apiClient.get(`/voters/${voterId}/status`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get voter status');
    }
  }

  // Candidate Management APIs
  async getCandidates(filters = {}) {
    try {
      const response = await apiClient.get('/candidates', { params: filters });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get candidates');
    }
  }

  async addCandidate(candidateData) {
    try {
      const response = await apiClient.post('/candidates', candidateData);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to add candidate');
    }
  }

  async updateCandidate(candidateId, candidateData) {
    try {
      const response = await apiClient.put(`/candidates/${candidateId}`, candidateData);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to update candidate');
    }
  }

  async deleteCandidate(candidateId) {
    try {
      const response = await apiClient.delete(`/candidates/${candidateId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to delete candidate');
    }
  }

  // Performance Metrics APIs
  async getPerformanceMetrics() {
    try {
      const response = await apiClient.get('/metrics/performance');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get performance metrics');
    }
  }

  async getNetworkStats() {
    try {
      const response = await apiClient.get('/network/stats');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get network stats');
    }
  }

  // File Upload/Download APIs
  async uploadFile(file, type) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      
      const response = await apiClient.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to upload file');
    }
  }

  async downloadReport(reportType, format = 'pdf') {
    try {
      const response = await apiClient.get(`/reports/${reportType}`, {
        params: { format },
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to download report');
    }
  }

  // Utility Methods
  handleError(error, defaultMessage) {
    const message = error.response?.data?.message || error.message || defaultMessage;
    const status = error.response?.status;
    const code = error.response?.data?.code;
    
    return {
      message,
      status,
      code,
      originalError: error,
    };
  }

  // Cancel all pending requests
  cancelAllRequests() {
    // This would require implementing request cancellation tokens
    console.log('🚫 Cancelling all pending requests');
  }

  // Set auth token
  setAuthToken(token) {
    localStorage.setItem('authToken', token);
  }

  // Clear auth token
  clearAuthToken() {
    localStorage.removeItem('authToken');
  }

  // Get current auth token
  getAuthToken() {
    return localStorage.getItem('authToken');
  }
}

// Create and export singleton instance
export const apiService = new ApiService();
export default apiService;