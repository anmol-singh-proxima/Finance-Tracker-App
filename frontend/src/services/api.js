import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  register: (email, password) => apiClient.post('/auth/register', { email, password }),
  login: (email, password) => apiClient.post('/auth/login', { email, password }),
  logout: () => apiClient.post('/auth/logout'),
  getProfile: () => apiClient.get('/auth/profile'),
};

// Expense endpoints
export const expenseAPI = {
  getExpenses: () => apiClient.get('/expenses'),
  getExpenseById: (id) => apiClient.get(`/expenses/${id}`),
  createExpense: (data) => apiClient.post('/expenses', data),
  updateExpense: (id, data) => apiClient.put(`/expenses/${id}`, data),
  deleteExpense: (id) => apiClient.delete(`/expenses/${id}`),
};

// Investment endpoints
export const investmentAPI = {
  getInvestments: () => apiClient.get('/investments'),
  getInvestmentById: (id) => apiClient.get(`/investments/${id}`),
  createInvestment: (data) => apiClient.post('/investments', data),
  updateInvestment: (id, data) => apiClient.put(`/investments/${id}`, data),
  deleteInvestment: (id) => apiClient.delete(`/investments/${id}`),
};

// Dashboard endpoints
export const dashboardAPI = {
  getSummary: () => apiClient.get('/dashboard/summary'),
  getChartData: () => apiClient.get('/dashboard/chart-data'),
};

export default apiClient;
