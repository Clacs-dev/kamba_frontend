import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../lib/api";

export default function Registo() {
    const navigate = useNavigate();
    const [companyName, setCompanyName] = useState("");
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [erro, setErro] = useState("");
    const [sucesso, setSucesso] = useState(false);
    const [aCarregar, setACarregar] = useState(false);

    const submeter = async (e: React.FormEvent) => {
        e.preventDefault();
        setErro("");
        setACarregar(true);
        try {
            await api.post("/auth/register", {
                company_name: companyName,
                full_name: fullName,
                email,
                password,
            });
            setSucesso(true);
            // Após registar, encaminha para o login ao fim de um instante.
            setTimeout(() => navigate("/login"), 1500);
        } catch (err: any) {
            setErro(err.response?.data?.detail || "Falha no registo.");
        } finally {
            setACarregar(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
                <h1 className="text-3xl font-bold text-slate-800">Criar conta</h1>
                <p className="text-slate-500 mb-6">Registe a sua empresa no KAMBA</p>

                {sucesso ? (
                    <p className="text-green-600">Conta criada! A encaminhar para o login...</p>
                ) : (
                    <form onSubmit={submeter} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nome da empresa</label>
                            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">O seu nome</label>
                            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Password (mín. 8 caracteres)</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>

                        {erro && <p className="text-sm text-red-600">{erro}</p>}

                        <button type="submit" disabled={aCarregar}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50">
                            {aCarregar ? "A criar..." : "Criar conta"}
                        </button>
                    </form>
                )}

                <p className="text-sm text-slate-500 mt-6 text-center">
                    Já tem conta?{" "}
                    <Link to="/login" className="text-blue-600 hover:underline">Entrar</Link>
                </p>
            </div>
        </div>
    );
}