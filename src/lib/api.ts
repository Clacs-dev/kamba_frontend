import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Antes de cada pedido, anexa o token guardado (se existir).
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("kamba_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;