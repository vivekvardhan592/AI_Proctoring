// Student API Service
const API_BASE_URL = import.meta.env.VITE_API_URL + '/api';

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Helper function to make API calls
const apiCall = async (endpoint, method = 'GET', data = null) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Add auth token if available
  const token = getAuthToken();
  if (token) {
    options.headers.Authorization = `Bearer ${token}`;
  }

  // Add body for non-GET requests
  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  const responseData = await response.json();

  if (!response.ok) {
    // If unauthorized, clear storage and redirect to login
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = import.meta.env.VITE_LOGIN_URL;
    }
    throw new Error(responseData.message || 'API Error');
  }

  return responseData;
};

// Auth API endpoints
export const authAPI = {
  getMe: async () => {
    return apiCall('/auth/me', 'GET');
  },
};

// Exam API endpoints
export const examAPI = {
  getAllExams: async () => {
    return apiCall('/exams', 'GET');
  },

  getExamById: async (id) => {
    return apiCall(`/exams/${id}`, 'GET');
  },
};

// Session API endpoints
export const sessionAPI = {
  startExam: async (examId) => {
    return apiCall('/sessions/start', 'POST', { examId });
  },

  endExam: async (sessionId) => {
    return apiCall(`/sessions/end/${sessionId}`, 'PUT');
  },

  getSessions: async () => {
    return apiCall('/sessions', 'GET');
  },

  getSessionById: async (sessionId) => {
    return apiCall(`/sessions/${sessionId}`, 'GET');
  },
};

// Violations API endpoints
export const violationAPI = {
  reportViolation: async (violationData) => {
    return apiCall('/violations', 'POST', violationData);
  },
};

export default {
  authAPI,
  examAPI,
  sessionAPI,
  violationAPI,
};
