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

// Token expirado ou servidor indisponível não podem aparecer como erro solto
// dentro de cada módulo: limpa a sessão e deixa o AuthContext mandar o
// utilizador para o login.
api.interceptors.response.use(
  (resp) => resp,
  (erro) => {
    const status = erro?.response?.status;
    const semToken = !localStorage.getItem("kamba_token");
    if ((status === 401 || status === 403) && !semToken) {
      localStorage.removeItem("kamba_token");
      window.dispatchEvent(new Event("kamba:sessao-expirada"));
    }
    return Promise.reject(erro);
  }
);

export default api;