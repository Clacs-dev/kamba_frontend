import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import api from "../lib/api";

// Os dados do utilizador que a rota /auth/me devolve.
interface Utilizador {
    id: number;
    company_id: number;
    company_name: string | null;
    email: string;
    full_name: string;
    role: string;
    is_active: boolean;
}
interface AuthContextType {
    token: string | null;
    user: Utilizador | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    aCarregar: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(
        localStorage.getItem("kamba_token")
    );
    const [user, setUser] = useState<Utilizador | null>(null);
    const [aCarregar, setACarregar] = useState(true);

    // Sempre que há token, vai buscar os dados do utilizador (/auth/me).
    // Isto corre no arranque (se já havia token guardado) e após o login.
    useEffect(() => {
        if (token) {
            api.get("/auth/me")
                .then((resp) => setUser(resp.data))
                .catch(() => {
                    // Token inválido ou expirado: limpa tudo.
                    localStorage.removeItem("kamba_token");
                    setToken(null);
                    setUser(null);
                })
                .finally(() => setACarregar(false));
        } else {
            setUser(null);
            setACarregar(false);
        }
    }, [token]);

    const login = async (email: string, password: string) => {
        const resp = await api.post("/auth/login", { email, password });
        const newToken = resp.data.access_token;
        localStorage.setItem("kamba_token", newToken);
        setToken(newToken); // isto dispara o useEffect que vai buscar o /auth/me
    };

    const logout = () => {
        localStorage.removeItem("kamba_token");
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ token, user, login, logout, aCarregar }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth tem de estar dentro de AuthProvider");
    return ctx;
}