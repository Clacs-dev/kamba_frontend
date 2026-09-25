import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import Botao from "../components/ui/Botao";
import Notice from "../components/ui/Notice";
import api from "../lib/api";

export default function Login() {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [erro, setErro] = useState("");
    const [aCarregar, setACarregar] = useState(false);

    // Recuperação de senha ("Esqueci a senha").
    const [recuperar, setRecuperar] = useState(false);
    const [emailRec, setEmailRec] = useState("");
    const [msgRec, setMsgRec] = useState("");
    const [senhaRec, setSenhaRec] = useState<string | null>(null);
    const [aRecuperar, setARecuperar] = useState(false);

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

    const recuperarAcesso = async (e: React.FormEvent) => {
        e.preventDefault();
        setMsgRec("");
        setSenhaRec(null);
        setARecuperar(true);
        try {
            const resp = await api.post("/auth/forgot-password", { email: emailRec });
            setMsgRec(resp.data.detail || "Verifique o seu email.");
            setSenhaRec(resp.data.temporary_password ?? null);
        } catch (err: any) {
            setMsgRec(err.response?.data?.detail || "Não foi possível recuperar a senha.");
        } finally {
            setARecuperar(false);
        }
    };

    const abrirRecuperar = () => {
        setEmailRec(email);
        setMsgRec("");
        setSenhaRec(null);
        setRecuperar(true);
    };

    const inputCls = "w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] text-strong focus:outline-none focus:border-pri";

    return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-paper border border-line rounded-xl shadow-[0_12px_40px_rgba(34,50,58,0.12)] p-6 sm:p-8">
                <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-serif font-semibold text-xl text-pri tracking-wide">KAMBA</span>
                </div>
                <p className="text-[9.5px] uppercase tracking-[0.2em] text-dim mb-6">Capital Humano · Desempenho · Cultura</p>

                {!recuperar ? (
                    <>
                        <form onSubmit={submeter} className="space-y-3">
                            <div>
                                <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Email</label>
                                <input
                                    type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Password</label>
                                <input
                                    type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                                    className={inputCls}
                                />
                                <div className="flex justify-end mt-1">
                                    <button type="button" onClick={abrirRecuperar}
                                        className="text-[11.5px] text-dim hover:text-pri transition-colors">
                                        Esqueci a senha
                                    </button>
                                </div>
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
                    </>
                ) : (
                    <div>
                        <h2 className="text-[15px] font-semibold mb-1">Recuperar acesso</h2>
                        <p className="text-dim text-[12px] mb-4 leading-relaxed">
                            Indique o email da conta. Será gerada uma nova password temporária de primeiro acesso.
                        </p>
                        <form onSubmit={recuperarAcesso} className="space-y-3">
                            <div>
                                <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Email</label>
                                <input
                                    type="email" value={emailRec} onChange={(e) => setEmailRec(e.target.value)} required
                                    className={inputCls}
                                />
                            </div>

                            {msgRec && (
                                <Notice variante={senhaRec ? "soft" : "default"}>
                                    {msgRec}
                                    {senhaRec && (
                                        <>
                                            <div className="mt-2">Nova password temporária:</div>
                                            <div className="font-mono text-[15px] text-strong bg-paper border border-line rounded-lg px-3 py-2 mt-1.5 select-all">
                                                {senhaRec}
                                            </div>
                                            <div className="text-dim text-[11px] mt-2">
                                                Entregue-a ao colaborador. Ele terá de a alterar no primeiro acesso.
                                            </div>
                                        </>
                                    )}
                                </Notice>
                            )}

                            <Botao type="submit" disabled={aRecuperar || !emailRec} className="w-full">
                                {aRecuperar ? "A recuperar..." : "Gerar nova password"}
                            </Botao>
                            <button
                                type="button"
                                onClick={() => { setRecuperar(false); setMsgRec(""); setSenhaRec(null); }}
                                className="w-full text-center text-[12px] text-dim hover:text-pri transition-colors"
                            >
                                Voltar ao login
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}