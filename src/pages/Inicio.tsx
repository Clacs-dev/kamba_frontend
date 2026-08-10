import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Cabecalho from "../components/Cabecalho";
import PainelColaborador from "../components/inicio/PainelColaborador";
import PainelGestao from "../components/inicio/PainelGestao";

export default function Inicio() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const perfil = user?.role || "";
    const eGestao = perfil === "capital_humano" || perfil === "administracao";

    // Converte o antigo "irPara" numa navegação real por URL.
    const irPara = (seccao: string) => navigate(`/${seccao === "inicio" ? "" : seccao}`);

    return (
        <div>
            <Cabecalho
                eyebrow="Capital Humano · Desempenho · Cultura"
                titulo={`Bem-vindo, ${user?.full_name?.split(" ")[0] || ""}`}
                descricao={eGestao ? "Painel de gestão da empresa." : "O seu painel pessoal."}
            />

            {eGestao ? <PainelGestao irPara={irPara} /> : <PainelColaborador irPara={irPara} />}
        </div>
    );
}