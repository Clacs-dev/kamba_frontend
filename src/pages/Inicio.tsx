import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Cabecalho from "../components/Cabecalho";
import Cartao from "../components/Cartao";
import PainelColaborador from "../components/inicio/PainelColaborador";
import PainelGestao from "../components/inicio/PainelGestao";

export default function Inicio() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const perfil = user?.role || "";
    const eAdmin = perfil === "admin";
    const eGestao = perfil === "capital_humano" || perfil === "administracao";
    const eDirector = perfil === "director";

    // Converte o antigo "irPara" numa navegação real por URL.
    const irPara = (seccao: string) => navigate(`/${seccao === "inicio" ? "" : seccao}`);

    return (
        <div>
            <Cabecalho
                eyebrow="Capital Humano · Desempenho · Cultura"
                titulo={`Bem-vindo, ${user?.full_name?.split(" ")[0] || ""}`}
                descricao={eAdmin ? "Gestão de utilizadores e níveis de acesso." : eGestao ? "Painel de gestão da empresa." : "O seu painel pessoal."}
            />

            {eAdmin ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <Cartao onClick={() => irPara("colaboradores")}>
                        <div className="font-serif font-semibold text-[26px] text-pri-dark">☰</div>
                        <div className="text-[13px] font-semibold mt-1">Colaboradores</div>
                        <div className="text-[11.5px] text-dim mt-0.5">Criar contas e atribuir perfis de acesso.</div>
                        <div className="text-[10.5px] text-pri mt-1.5">abrir →</div>
                    </Cartao>
                    <Cartao onClick={() => irPara("portal")}>
                        <div className="font-serif font-semibold text-[26px] text-pri-dark">▣</div>
                        <div className="text-[13px] font-semibold mt-1">Portal do Colaborador</div>
                        <div className="text-[11.5px] text-dim mt-0.5">Documentos da empresa, assinaturas e leituras.</div>
                        <div className="text-[10.5px] text-pri mt-1.5">abrir →</div>
                    </Cartao>
                </div>
            ) : eGestao ? (
                <PainelGestao irPara={irPara} />
            ) : (
                <>
                    {eDirector && (
                        <Cartao onClick={() => irPara("equipa")} className="mb-3.5">
                            <div className="font-serif font-semibold text-[26px] text-pri-dark">☰</div>
                            <div className="text-[13px] font-semibold mt-1">Equipa de direção</div>
                            <div className="text-[11.5px] text-dim mt-0.5">Colaboradores da direção que gere.</div>
                            <div className="text-[10.5px] text-pri mt-1.5">abrir →</div>
                        </Cartao>
                    )}
                    <PainelColaborador irPara={irPara} />
                </>
            )}
        </div>
    );
}