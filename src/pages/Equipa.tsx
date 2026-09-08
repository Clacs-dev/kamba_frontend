import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import Cabecalho from "../components/Cabecalho";
import Cartao from "../components/Cartao";
import FaixaKpis from "../components/FaixaKpis";
import Tag from "../components/ui/Tag";

interface Membro {
    id: number;
    full_name: string;
    email: string;
    role: string;
    is_active: boolean;
}

export default function Equipa() {
    const navigate = useNavigate();
    const [membros, setMembros] = useState<Membro[]>([]);
    const [aCarregar, setACarregar] = useState(true);
    const [erro, setErro] = useState("");
    const [direcao, setDirecao] = useState("");

    useEffect(() => {
        // Direção gerida pelo director (da sua ficha).
        api.get("/me/profile")
            .then((r) => setDirecao(r.data?.department || ""))
            .catch(() => setDirecao(""));
        api.get("/collaborators/my-direction")
            .then((r) => setMembros(r.data))
            .catch(() => setErro("Não foi possível carregar a equipa da direção."))
            .finally(() => setACarregar(false));
    }, []);

    const ativos = membros.filter((m) => m.is_active).length;

    return (
        <div>
            <Cabecalho
                eyebrow="Minha direção"
                titulo="Equipa de Direção"
                descricao={direcao ? `Os colaboradores da direção que gere: ${direcao}.` : "Os colaboradores da direção que gere."}
            />

            <FaixaKpis kpis={[
                { valor: membros.length, label: "Colaboradores na direção" },
                { valor: ativos, label: "Ativos", cor: "ok" },
                { valor: membros.length - ativos, label: "Inativos", cor: membros.length - ativos > 0 ? "warn" : "normal" },
            ]} />

            {aCarregar ? (
                <p className="text-dim text-sm">A carregar a equipa...</p>
            ) : erro ? (
                <p className="text-bad text-sm">{erro}</p>
            ) : membros.length === 0 ? (
                <Cartao>
                    <p className="text-dim text-center py-4">
                        {direcao
                            ? "Ainda não há colaboradores associados a esta direção."
                            : "A sua ficha ainda não tem uma direção atribuída. Contacte o Capital Humano."}
                    </p>
                </Cartao>
            ) : (
                <Cartao className="p-0">
                    <div className="overflow-x-auto md:overflow-visible">
                        <table className="w-full text-[12.8px] min-w-[520px]">
                            <thead>
                                <tr>
                                    <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-3 py-2.5 border-b border-line">Colaborador</th>
                                    <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-3 py-2.5 border-b border-line">Email</th>
                                    <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-3 py-2.5 border-b border-line">Situação</th>
                                    <th className="text-right text-[10.3px] uppercase tracking-wide text-dim px-3 py-2.5 border-b border-line">Abrir</th>
                                </tr>
                            </thead>
                            <tbody>
                                {membros.map((m) => (
                                    <tr
                                        key={m.id}
                                        onClick={() => navigate(`/colaboradores/${m.id}/portal`, { state: { nome: m.full_name } })}
                                        className="hover:bg-panel transition-colors cursor-pointer"
                                    >
                                        <td className="px-3 py-2.5 border-b border-line2">
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/colaboradores/${m.id}/portal`, { state: { nome: m.full_name } })}
                                                className="text-strong font-bold hover:text-pri hover:underline text-left"
                                            >
                                                {m.full_name}
                                            </button>
                                        </td>
                                        <td className="px-3 py-2.5 border-b border-line2 text-ink">{m.email}</td>
                                        <td className="px-3 py-2.5 border-b border-line2">
                                            {m.is_active
                                                ? <Tag variante="ok">Ativo</Tag>
                                                : <Tag variante="bad">Inativo</Tag>}
                                        </td>
                                        <td className="px-3 py-2.5 border-b border-line2 text-right">
                                            <span className="text-pri text-[11.5px] font-semibold">abrir →</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Cartao>
            )}
        </div>
    );
}
