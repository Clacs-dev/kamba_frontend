import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../lib/api";
import Botao from "../components/ui/Botao";
import Notice from "../components/ui/Notice";

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
        <div className="min-h-screen bg-bg flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-paper border border-line rounded-xl shadow-[0_12px_40px_rgba(34,50,58,0.12)] p-6 sm:p-8">
                <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-serif font-semibold text-xl text-pri tracking-wide">KAMBA</span>
                </div>
                <h2 className="text-[19px] mb-1">Criar conta</h2>
                <p className="text-dim text-[12.8px] mb-6">Registe a sua empresa no KAMBA</p>

                {sucesso ? (
                    <Notice variante="soft">Conta criada! A encaminhar para o login...</Notice>
                ) : (
                    <form onSubmit={submeter} className="space-y-3">
                        <div>
                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Nome da empresa</label>
                            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required
                                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] text-strong focus:outline-none focus:border-pri" />
                        </div>
                        <div>
                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">O seu nome</label>
                            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required
                                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] text-strong focus:outline-none focus:border-pri" />
                        </div>
                        <div>
                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] text-strong focus:outline-none focus:border-pri" />
                        </div>
                        <div>
                            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Password (mín. 8 caracteres)</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] text-strong focus:outline-none focus:border-pri" />
                        </div>

                        {erro && <p className="text-bad text-sm">{erro}</p>}

                        <Botao type="submit" disabled={aCarregar} className="w-full">
                            {aCarregar ? "A criar..." : "Criar conta"}
                        </Botao>
                    </form>
                )}

                <p className="text-dim text-[12px] mt-6 text-center">
                    Já tem conta?{" "}
                    <Link to="/login" className="text-pri font-semibold hover:underline">Entrar</Link>
                </p>
            </div>
        </div>
    );
}
