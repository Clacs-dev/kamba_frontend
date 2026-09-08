import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import Botao from "../components/ui/Botao";

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
        <div className="min-h-screen bg-bg flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-paper border border-line rounded-xl shadow-[0_12px_40px_rgba(34,50,58,0.12)] p-6 sm:p-8">
                <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-serif font-semibold text-xl text-pri tracking-wide">KAMBA</span>
                </div>
                <p className="text-[9.5px] uppercase tracking-[0.2em] text-dim mb-6">Capital Humano · Desempenho · Cultura</p>

                <form onSubmit={submeter} className="space-y-3">
                    <div>
                        <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Email</label>
                        <input
                            type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                            className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] text-strong focus:outline-none focus:border-pri"
                        />
                    </div>
                    <div>
                        <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Password</label>
                        <input
                            type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                            className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] text-strong focus:outline-none focus:border-pri"
                        />
                    </div>

                    {erro && <p className="text-bad text-sm">{erro}</p>}

                    <Botao type="submit" disabled={aCarregar} className="w-full">
                        {aCarregar ? "A entrar..." : "Entrar"}
                    </Botao>
                </form>
                <p className="text-dim text-[12px] mt-6 text-center">
                    Não tem conta?{" "}
                    <Link to="/registo" className="text-pri font-semibold hover:underline">Criar conta</Link>
                </p>
            </div>
        </div>
    );
}
