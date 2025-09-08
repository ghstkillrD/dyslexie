import axios from 'axios';

// Create axios interceptor for automatic token refresh
export const setupAxiosInterceptors = () => {
  // Request interceptor to add token to all requests
  axios.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle token refresh
  axios.interceptors.response.use(
    (response) => {
      return response;
    },
    async (error) => {
      const original = error.config;

      // If token expired and we haven't already tried to refresh
      if (error.response?.status === 401 && !original._retry) {
        original._retry = true;

        try {
          const refreshToken = localStorage.getItem('refresh_token');
          if (refreshToken) {
            const response = await axios.post('http://127.0.0.1:8000/api/users/token/refresh/', {
              refresh: refreshToken
            });

            if (response.data.access) {
              localStorage.setItem('token', response.data.access);
              
              // Update refresh token if provided
              if (response.data.refresh) {
                localStorage.setItem('refresh_token', response.data.refresh);
              }

              // Retry original request with new token
              original.headers.Authorization = `Bearer ${response.data.access}`;
              return axios(original);
            }
          }
        } catch (refreshError) {
          // Refresh failed, redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );
};

export default setupAxiosInterceptors;
