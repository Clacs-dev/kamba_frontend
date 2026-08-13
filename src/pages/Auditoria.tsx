import { useEffect, useState } from "react";
import api from "../lib/api";
import Cabecalho from "../components/Cabecalho";
import Cartao from "../components/Cartao";

interface EventoAuditoria {
    id: number;
    actor_name: string;
    actor_role: string;
    action: string;
    detail: string | null;
    created_at: string;
}

// Traduz a ação técnica para texto legível.
function traduzAcao(action: string): string {
    const mapa: Record<string, string> = {
        "avaliacao.validada": "Avaliação validada",
        "disciplina.decisao": "Decisão disciplinar emitida",
        "formacao.plano_aprovado": "Plano de formação aprovado",
    };
    return mapa[action] || action;
}

function traduzPerfil(role: string): string {
    const mapa: Record<string, string> = {
        colaborador: "Colaborador", director: "Director", capital_humano: "Capital Humano",
        comissao: "Comissão", administracao: "Administração",
    };
    return mapa[role] || role;
}

// Formata a data ISO para algo legível.
function formatarData(iso: string): string {
    try {
        const d = new Date(iso);
        return d.toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
        return iso;
    }
}

export default function Auditoria() {
    const [eventos, setEventos] = useState<EventoAuditoria[]>([]);
    const [aCarregar, setACarregar] = useState(true);
    const [erro, setErro] = useState("");

    useEffect(() => {
        api.get("/audit")
            .then((r) => setEventos(r.data))
            .catch((e) => setErro(e.response?.data?.detail || "Erro ao carregar a auditoria."))
            .finally(() => setACarregar(false));
    }, []);

    return (
        <div>
            <Cabecalho
                eyebrow="Prova documental · capítulo 7"
                titulo="Trilha de Auditoria"
                descricao="Registo dos atos relevantes praticados na plataforma — quem, o quê e quando. Acesso à Administração e ao Capital Humano."
            />

            {aCarregar ? (
                <p className="text-dim text-sm">A carregar...</p>
            ) : erro ? (
                <p className="text-bad text-sm">{erro}</p>
            ) : eventos.length === 0 ? (
                <Cartao><p className="text-dim text-center py-4">Ainda não há eventos registados.</p></Cartao>
            ) : (
                <Cartao className="p-0 overflow-hidden">
                    <table className="w-full text-[12.8px]">
                        <thead>
                            <tr>
                                <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-4 py-2.5 border-b border-line">Data</th>
                                <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-4 py-2.5 border-b border-line">Ato</th>
                                <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-4 py-2.5 border-b border-line">Autor</th>
                                <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-4 py-2.5 border-b border-line">Detalhe</th>
                            </tr>
                        </thead>
                        <tbody>
                            {eventos.map((e) => (
                                <tr key={e.id} className="hover:bg-panel">
                                    <td className="px-4 py-2.5 border-b border-line2 text-dim whitespace-nowrap">{formatarData(e.created_at)}</td>
                                    <td className="px-4 py-2.5 border-b border-line2">
                                        <b className="text-strong">{traduzAcao(e.action)}</b>
                                    </td>
                                    <td className="px-4 py-2.5 border-b border-line2">
                                        {e.actor_name}
                                        <span className="text-dim text-[10.8px] ml-1.5">({traduzPerfil(e.actor_role)})</span>
                                    </td>
                                    <td className="px-4 py-2.5 border-b border-line2 text-ink">{e.detail || "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Cartao>
            )}
        </div>
    );
}