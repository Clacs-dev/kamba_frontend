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
    const [verSenha, setVerSenha] = useState(false);
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
                                <div className="relative">
                                    <input
                                        type={verSenha ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoComplete="current-password"
                                        className={`${inputCls} pr-10`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setVerSenha((v) => !v)}
                                        aria-label={verSenha ? "Ocultar a password" : "Mostrar a password"}
                                        aria-pressed={verSenha}
                                        title={verSenha ? "Ocultar a password" : "Mostrar a password"}
                                        className="absolute right-0 top-0 h-full w-10 flex items-center justify-center text-dim hover:text-pri transition-colors"
                                    >
                                        <Olho oculto={verSenha} />
                                    </button>
                                </div>
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

// Olho para mostrar/ocultar a password. Fica com a cor do texto herdada
// (currentColor) para acompanhar os estados de hover e foco do botão.
function Olho({ oculto }: { oculto: boolean }) {
    return (
        <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
            {oculto && <path d="M3 3l18 18" />}
        </svg>
    );
}