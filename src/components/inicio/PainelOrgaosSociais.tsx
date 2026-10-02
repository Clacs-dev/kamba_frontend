import { useEffect, useMemo, useState } from "react";
import api from "../../lib/api";
import Cartao from "../Cartao";
import Tag from "../ui/Tag";

interface Membro {
    id: number;
    user_id: number;
    full_name: string;
    role: string;
    organ_role: string | null;
}

interface OrganoApi {
    organ: string;
    label: string;
    members: Membro[];
}

// Os quatro órgãos sociais, pela ordem em que aparecem no módulo.
const ORGAOS = [
    { organ: "conselho_administracao", sigla: "ca", label: "Conselho de Administração" },
    { organ: "comissao_executiva", sigla: "ce", label: "Comissão Executiva" },
    { organ: "conselho_fiscal", sigla: "cf", label: "Conselho Fiscal" },
    { organ: "mesa_assembleia", sigla: "ma", label: "Mesa da Assembleia" },
];

const PERFIS: Record<string, string> = {
    colaborador: "Colaborador",
    director: "Director",
    capital_humano: "Capital Humano",
    comissao: "Comissão",
    administracao: "Administração",
    admin: "Admin",
};

export default function PainelOrgaosSociais({ irPara }: { irPara: (seccao: string) => void }) {
    const [organs, setOrgaos] = useState<OrganoApi[]>([]);
    const [aCarregar, setACarregar] = useState(true);

    useEffect(() => {
        api.get("/organs")
            .then((r) => setOrgaos(Array.isArray(r.data) ? r.data : []))
            .catch(() => setOrgaos([]))
            .finally(() => setACarregar(false));
    }, []);

    // Totais por órgão, sempre nos quatro órgãos (mesmo os vazios).
    const totais = useMemo(
        () =>
            ORGAOS.map((o) => {
                const membros = organs.find((x) => x.organ === o.organ)?.members ?? [];
                return { ...o, membros, total: membros.length };
            }),
        [organs]
    );

    // Total de membros: contam-se as pessoas distintas (um collaborator pode
    // estar em mais de um órgão).
    const totalMembros = useMemo(() => {
        const distintos = new Set<number>();
        totais.forEach((o) => o.membros.forEach((m) => distintos.add(m.user_id)));
        return distintos.size;
    }, [totais]);

    const SemMembros = totais.filter((o) => o.total === 0).length;

    if (aCarregar) return <p className="text-dim text-sm">A carregar os órgãos sociais...</p>;

    return (
        <div className="mt-4">
            {/* Totais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-3.5">
                {totais.map((o) => (
                    <Cartao key={o.organ} onClick={() => irPara(`orgaos-sociais/${o.sigla}`)}>
                        <div className="font-serif font-semibold text-[26px] text-pri-dark">{o.total}</div>
                        <div className="text-[10.5px] text-dim uppercase tracking-wide mt-0.5 leading-tight">{o.label}</div>
                        <div className="text-[10.5px] text-pri mt-1.5">ver detalhe →</div>
                    </Cartao>
                ))}
            </div>

            {/* Resumo + detalhe por órgão */}
            <Cartao className="p-0">
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-line">
                    <div>
                        <h3 className="text-[14.5px] m-0">Órgãos Sociais</h3>
                        <p className="text-[11.5px] text-dim m-0">
                            {totalMembros} pessoa(s) em {4 - SemMembros} de 4 órgãos
                            {SemMembros > 0 && ` · ${SemMembros} por preencher`}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => irPara("orgaos-sociais")}
                        className="text-[11.5px] text-pri font-semibold hover:underline bg-transparent border-0 cursor-pointer"
                    >
                        abrir módulo →
                    </button>
                </div>

                <div className="overflow-x-auto md:overflow-visible">
                    <table className="w-full text-[12.8px] min-w-[480px]">
                        <thead>
                            <tr>
                                <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-3 py-2.5 border-b border-line">Órgão</th>
                                <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-3 py-2.5 border-b border-line">Total de membros</th>
                                <th className="text-left text-[10.3px] uppercase tracking-wide text-dim px-3 py-2.5 border-b border-line">Composição</th>
                            </tr>
                        </thead>
                        <tbody>
                            {totais.map((o) => (
                                <tr key={o.organ} className="hover:bg-panel transition-colors">
                                    <td className="px-3 py-2.5 border-b border-line2 font-semibold text-strong">
                                        {o.label}
                                    </td>
                                    <td className="px-3 py-2.5 border-b border-line2 font-serif font-semibold text-pri-dark">
                                        {o.total}
                                    </td>
                                    <td className="px-3 py-2.5 border-b border-line2">
                                        {o.total === 0 ? (
                                            <span className="text-dim text-[12px]">Sem membros</span>
                                        ) : (
                                            <>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {o.membros.map((m) => (
                                                        <Tag key={m.id} variante="pri">
                                                            {m.organ_role || m.full_name}
                                                        </Tag>
                                                    ))}
                                                </div>
                                                <div className="text-[11px] text-dim mt-1.5">
                                                    {[...new Set(o.membros.map((m) => PERFIS[m.role] || m.role))].join(" · ")}
                                                </div>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td className="px-3 py-2.5 text-[11.5px] uppercase tracking-wide text-dim">Total geral</td>
                                <td className="px-3 py-2.5 font-serif font-semibold text-pri-dark text-[15px]">{totalMembros}</td>
                                <td className="px-3 py-2.5 text-[11.5px] text-dim">pessoas distintas</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </Cartao>
        </div>
    );
}
