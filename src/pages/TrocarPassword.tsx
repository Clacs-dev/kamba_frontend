import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";

export default function TrocarPassword() {
    const { user, recarregarUtilizador } = useAuth();
    const [atual, setAtual] = useState("");
    const [nova, setNova] = useState("");
    const [confirmar, setConfirmar] = useState("");
    const [erro, setErro] = useState("");
    const [aCarregar, setACarregar] = useState(false);

    const submeter = async () => {
        setErro("");
        if (nova.length < 8) { setErro("A nova password deve ter pelo menos 8 caracteres."); return; }
        if (nova !== confirmar) { setErro("As passwords não coincidem."); return; }
        setACarregar(true);
        try {
            await api.post("/auth/change-password", {
                current_password: atual,
                new_password: nova,
            });
            // Recarrega o utilizador para atualizar o must_change_password.
            if (recarregarUtilizador) await recarregarUtilizador();
        } catch (err: any) {
            setErro(err.response?.data?.detail || "Erro ao trocar a password.");
        } finally {
            setACarregar(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-4">
            <div className="bg-paper border border-line rounded-2xl shadow-xl p-7 w-full max-w-md">
                <div className="text-[10px] tracking-[0.22em] uppercase text-pri mb-1">Segurança da conta</div>
                <h2 className="text-[22px] mb-2">Defina a sua password</h2>
                <p className="text-dim text-[12.8px] mb-5">
                    Olá, {user?.full_name?.split(" ")[0]}. A sua conta foi criada com uma password temporária.
                    Por segurança, defina agora uma password pessoal antes de continuar.
                </p>

                <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Password atual (temporária)</label>
                <input type="password" value={atual} onChange={(e) => setAtual(e.target.value)}
                    className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri" />

                <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Nova password (mín. 8 caracteres)</label>
                <input type="password" value={nova} onChange={(e) => setNova(e.target.value)}
                    className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri" />

                <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Confirmar nova password</label>
                <input type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)}
                    className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-4 focus:outline-none focus:border-pri" />

                {erro && <p className="text-bad text-sm mb-3">{erro}</p>}

                <button onClick={submeter} disabled={aCarregar || !atual || !nova || !confirmar}
                    className="w-full bg-pri text-white rounded-lg py-2.5 text-[13px] font-semibold hover:bg-pri-dark transition-colors disabled:opacity-40">
                    {aCarregar ? "A guardar..." : "Definir password e continuar"}
                </button>
            </div>
        </div>
    );
}