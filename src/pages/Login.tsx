import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

export default function Login() {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [erro, setErro] = useState("");
    const [aCarregar, setACarregar] = useState(false);

    const submeter = async (e: React.FormEvent) => {
        e.preventDefault();
        setErro("");
        setACarregar(true);
        try {
            await login(email, password);
        } catch (err: any) {
            setErro(err.response?.data?.detail || "Falha no login. Verifique as credenciais.");
        } finally {
            setACarregar(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
                <h1 className="text-3xl font-bold text-slate-800">KAMBA</h1>
                <p className="text-slate-500 mb-6">Gestão de Capital Humano</p>

                <form onSubmit={submeter} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input
                            type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                        <input
                            type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {erro && <p className="text-sm text-red-600">{erro}</p>}

                    <button
                        type="submit" disabled={aCarregar}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {aCarregar ? "A entrar..." : "Entrar"}
                    </button>
                </form>
                <p className="text-sm text-slate-500 mt-6 text-center">
                    Não tem conta?{" "}
                    <Link to="/registo" className="text-blue-600 hover:underline">Criar conta</Link>
                </p>
            </div>
        </div>
    );
}