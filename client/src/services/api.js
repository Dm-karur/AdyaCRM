import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // Relative path for shared hosting (frontend and backend on same domain)
  withCredentials: true, // Send secure HttpOnly cookies with every request
});

// Response interceptor to catch 401 Unauthorized errors (invalid/missing cookies)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the backend says not authorized, it means the session is dead or cookie is missing
    if (error.response && error.response.status === 401) {
      console.error("Session expired or missing token. Forcing logout.");
      localStorage.removeItem('userInfo');
      // Only redirect if we are not already on the login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
