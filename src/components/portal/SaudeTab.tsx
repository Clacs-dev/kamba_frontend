import { useEffect, useState } from "react";
import api from "../../lib/api";
import Cartao from "../Cartao";
import Tag from "../ui/Tag";
import Notice from "../ui/Notice";

interface Exame {
    id: number;
    fitness: string;
    exam_date: string;
    next_exam_date?: string | null;
    restriction_note?: string | null;
}

// Traduz a aptidão para texto legível.
function traduzAptidao(f: string): string {
    const mapa: Record<string, string> = {
        apto: "Apto sem restrições",
        apto_com_restricoes: "Apto com restrições",
        inapto: "Inapto",
    };
    return mapa[f] || f;
}

function varianteAptidao(f: string): "ok" | "warn" | "bad" {
    if (f === "apto") return "ok";
    if (f === "apto_com_restricoes") return "warn";
    return "bad";
}

export default function SaudeTab() {
    const [exames, setExames] = useState<Exame[]>([]);
    const [aCarregar, setACarregar] = useState(true);

    useEffect(() => {
        api.get("/occupational-health/me/exams")
            .then((resp) => setExames(resp.data))
            .catch(() => setExames([]))
            .finally(() => setACarregar(false));
    }, []);

    return (
        <Cartao>
            <h3 className="text-[14.5px] mb-3">Saúde ocupacional — aptidão laboral</h3>

            {aCarregar ? (
                <p className="text-dim text-sm">A carregar...</p>
            ) : exames.length === 0 ? (
                <p className="text-dim text-sm py-4 text-center">Ainda não há exames registados.</p>
            ) : (
                <table className="w-full text-[12.8px]">
                    <thead>
                        <tr>
                            <th className="text-left text-[10.3px] uppercase tracking-wide text-dim py-2 border-b border-line">Data</th>
                            <th className="text-left text-[10.3px] uppercase tracking-wide text-dim py-2 border-b border-line">Aptidão</th>
                            <th className="text-left text-[10.3px] uppercase tracking-wide text-dim py-2 border-b border-line">Próximo exame</th>
                        </tr>
                    </thead>
                    <tbody>
                        {exames.map((e) => (
                            <tr key={e.id}>
                                <td className="py-2 border-b border-line2">{e.exam_date}</td>
                                <td className="py-2 border-b border-line2">
                                    <Tag variante={varianteAptidao(e.fitness)}>{traduzAptidao(e.fitness)}</Tag>
                                    {e.restriction_note && (
                                        <span className="text-dim text-[11px] ml-2">{e.restriction_note}</span>
                                    )}
                                </td>
                                <td className="py-2 border-b border-line2">{e.next_exam_date || "—"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            <Notice className="mt-3">
                <b>Privacidade por desenho:</b> regista-se apenas a aptidão — nunca diagnósticos, reservados ao médico do trabalho.
            </Notice>
        </Cartao>
    );
}