import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // Relative path for shared hosting (frontend and backend on same domain)
});

// Request interceptor to add the auth token header to requests
api.interceptors.request.use(
  (config) => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      const parsedInfo = JSON.parse(userInfo);
      config.headers.Authorization = `Bearer ${parsedInfo.token}`;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
