import { useEffect, useState } from "react";
import api from "../../lib/api";
import Cartao from "../Cartao";

interface Salario {
    id: number;
    year: number;
    gross_salary: number;
    salary_grade?: string | null;
}

interface Assiduidade {
    id: number;
    period: string;
    present_days: number;
    justified_absences: number;
    unjustified_absences: number;
    vacation_days_taken: number;
}

export default function RemuneracaoTab() {
    const [salarios, setSalarios] = useState<Salario[]>([]);
    const [assiduidade, setAssiduidade] = useState<Assiduidade[]>([]);
    const [aCarregar, setACarregar] = useState(true);

    useEffect(() => {
        Promise.all([
            api.get("/compensation/me/salary").then((r) => setSalarios(r.data)).catch(() => { }),
            api.get("/compensation/me/attendance").then((r) => setAssiduidade(r.data)).catch(() => { }),
        ]).finally(() => setACarregar(false));
    }, []);

    if (aCarregar) return <p className="text-dim text-sm">A carregar...</p>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <Cartao>
                <h3 className="text-[14.5px] mb-3">Progressão salarial</h3>
                {salarios.length === 0 ? (
                    <p className="text-dim text-sm">Sem registos salariais.</p>
                ) : (
                    <table className="w-full text-[12.8px]">
                        <thead>
                            <tr>
                                <th className="text-left text-[10.3px] uppercase tracking-wide text-dim py-2 border-b border-line">Ano</th>
                                <th className="text-left text-[10.3px] uppercase tracking-wide text-dim py-2 border-b border-line">Vencimento</th>
                                <th className="text-left text-[10.3px] uppercase tracking-wide text-dim py-2 border-b border-line">Enquadramento</th>
                            </tr>
                        </thead>
                        <tbody>
                            {salarios.map((s) => (
                                <tr key={s.id}>
                                    <td className="py-2 border-b border-line2">{s.year}</td>
                                    <td className="py-2 border-b border-line2">{s.gross_salary.toLocaleString("pt-AO")} Kz</td>
                                    <td className="py-2 border-b border-line2">{s.salary_grade || "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <div className="text-dim text-[11px] mt-2">Visível apenas a si, ao Capital Humano e à Administração.</div>
            </Cartao>

            <Cartao>
                <h3 className="text-[14.5px] mb-3">Assiduidade</h3>
                {assiduidade.length === 0 ? (
                    <p className="text-dim text-sm">Sem registos de assiduidade.</p>
                ) : (
                    assiduidade.map((a) => (
                        <div key={a.id} className="mb-4">
                            <div className="text-[11px] text-dim uppercase tracking-wide mb-2">{a.period}</div>
                            <div className="grid grid-cols-2 gap-2.5">
                                <Metrica valor={a.present_days} label="Presenças" />
                                <Metrica valor={a.vacation_days_taken} label="Férias gozadas" />
                            </div>
                            <table className="w-full text-[12.8px] mt-2">
                                <tbody>
                                    <tr>
                                        <td className="py-1">Faltas justificadas</td>
                                        <td className="py-1 text-right">{a.justified_absences}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1">Faltas injustificadas</td>
                                        <td className="py-1 text-right">{a.unjustified_absences}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    ))
                )}
            </Cartao>
        </div>
    );
}

function Metrica({ valor, label }: { valor: number; label: string }) {
    return (
        <div>
            <div className="font-serif font-semibold text-[26px] text-pri-dark">{valor}</div>
            <div className="text-[10.5px] text-dim uppercase tracking-wide">{label}</div>
        </div>
    );
}