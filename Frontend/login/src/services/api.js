// Login Page API Service
const API_BASE_URL = '/api';

// Helper function to make API calls
const apiCall = async (endpoint, method = 'POST', data = null) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Add body for POST requests
  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const responseData = await response.json();
    return { ok: response.ok, status: response.status, data: responseData };
  } catch (error) {
    throw error;
  }
};

// Auth API endpoints
export const authAPI = {
  login: async (email, password) => {
    return apiCall('/auth/login', 'POST', { email, password });
  },

  register: async (name, email, password) => {
    return apiCall('/auth/register', 'POST', { name, email, password });
  },

  forgotPassword: async (email) => {
    return apiCall('/auth/forgot-password', 'POST', { email });
  },

  resetPassword: async (email, otp, newPassword) => {
    return apiCall('/auth/reset-password', 'POST', { email, otp, newPassword });
  },
};

export default authAPI;
