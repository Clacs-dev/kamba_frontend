import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ItemMenu {
    caminho: string;
    icone: string;
    label: string;
    perfis: string[];
}

// A ordem deste array é a ordem apresentada em cada bloco (alinhado com o protótipo KAMBA).
const ITENS: ItemMenu[] = [
    { caminho: "/", icone: "◈", label: "Início", perfis: ["colaborador", "director", "capital_humano", "comissao", "administracao", "admin"] },
    { caminho: "/portal", icone: "▣", label: "Portal do Colaborador", perfis: ["colaborador", "director", "capital_humano", "comissao", "administracao"] },
    { caminho: "/colaboradores", icone: "☰", label: "Colaboradores", perfis: ["capital_humano", "administracao", "admin"] },
    { caminho: "/equipa", icone: "☰", label: "Equipa de direção", perfis: ["director"] },
    { caminho: "/avaliacoes", icone: "✎", label: "Avaliação", perfis: ["colaborador", "director", "capital_humano", "comissao", "administracao"] },
    { caminho: "/disciplina", icone: "§", label: "Processos Disciplinares", perfis: ["director", "capital_humano", "administracao"] },
    { caminho: "/ausencias", icone: "⧗", label: "Férias & Ausências", perfis: ["colaborador", "director", "capital_humano", "administracao"] },
    { caminho: "/formacao", icone: "▸", label: "Plano de Formação", perfis: ["director", "capital_humano", "administracao"] },
    { caminho: "/cultura", icone: "◉", label: "Cultura", perfis: ["colaborador", "director", "capital_humano", "administracao"] },
    { caminho: "/chat", icone: "✉", label: "Mensagens", perfis: ["colaborador", "director", "capital_humano", "comissao", "administracao", "admin"] },
    { caminho: "/relatorios", icone: "▤", label: "Relatórios", perfis: ["capital_humano", "administracao"] },
    { caminho: "/dashboard", icone: "◇", label: "Dashboard", perfis: ["capital_humano", "administracao"] },
    { caminho: "/historico", icone: "↗", label: "Histórico (3 anos)", perfis: ["director", "capital_humano", "administracao"] },
    { caminho: "/auditoria", icone: "§", label: "Auditoria", perfis: ["administracao"] },
    { caminho: "/administracao", icone: "⚙", label: "Administração", perfis: ["administracao"] },
];

// Blocos de navegação — labels estilo KAMBA (`.side-lab`).
const BLOCOS: { titulo: string; caminhos: string[] }[] = [
    { titulo: "Geral", caminhos: ["/", "/portal", "/chat"] },
    { titulo: "Gestão", caminhos: ["/colaboradores", "/equipa", "/avaliacoes", "/disciplina", "/ausencias", "/formacao"] },
    { titulo: "Empresa", caminhos: ["/cultura", "/relatorios", "/dashboard", "/historico"] },
    { titulo: "Sistema", caminhos: ["/auditoria", "/administracao"] },
];

interface SidebarProps {
    aberto: boolean;
    aoFechar: () => void;
}

export default function Sidebar({ aberto, aoFechar }: SidebarProps) {
    const { user } = useAuth();
    const perfil = user?.role || "";
    const nomeEmpresa = user?.company_name || "";
    const visiveis = ITENS.filter((i) => i.perfis.includes(perfil));

    return (
        <>
            {/* Fundo escuro por trás do menu em mobile */}
            {aberto && (
                <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={aoFechar} />
            )}

            <nav
                className={`
          bg-paper border-r border-line py-3 flex-shrink-0
          w-[238px]
          fixed md:sticky md:top-[53px] top-0 left-0 z-50 md:z-auto
          h-screen md:h-[calc(100vh-53px)]
          overflow-y-auto
          transition-transform duration-200
          ${aberto ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
        `}
            >
                {/* Topo: empresa + perfil de acesso (ao gosto do protótipo) */}
                <div className="px-3.5 pb-3 mb-1 border-b border-line">
                    <div className="side-lab mt-1.5">Empresa (SaaS multi-cliente)</div>
                    <div className="w-full text-xs bg-panel border border-line rounded-[9px] px-3 py-2 text-strong truncate">
                        {nomeEmpresa || "Empresa"}
                    </div>
                    <div className="side-lab mt-3">Perfil de acesso</div>
                    <div className="flex items-center justify-center bg-pri border border-pri rounded-[9px] px-3 py-2 text-white text-xs font-semibold">
                        {traduzPerfil(perfil)}
                    </div>
                </div>

                {/* Navegação por blocos */}
                {BLOCOS.map((bloco) => {
                    const itens = visiveis.filter((i) => bloco.caminhos.includes(i.caminho));
                    if (itens.length === 0) return null;
                    return (
                        <div key={bloco.titulo}>
                            <div className="side-lab px-5 mt-4 mb-1.5">{bloco.titulo}</div>
                            {itens.map((item) => (
                                <NavLink
                                    key={item.caminho}
                                    to={item.caminho}
                                    end={item.caminho === "/"}
                                    onClick={aoFechar}
                                    className={({ isActive }) =>
                                        `w-full flex items-center gap-2.5 px-[18px] py-[9px] text-left text-[13px] border-l-[3px] transition-colors ${isActive
                                            ? "text-pri-dark border-pri bg-pri-bg"
                                            : "text-dim border-transparent hover:text-strong hover:bg-panel"
                                        }`
                                    }
                                >
                                    <span className="w-[18px] text-center">{item.icone}</span>
                                    <span>{item.label}</span>
                                </NavLink>
                            ))}
                        </div>
                    );
                })}
            </nav>
        </>
    );
}

function traduzPerfil(role: string): string {
    const mapa: Record<string, string> = {
        colaborador: "Colaborador",
        director: "Director",
        capital_humano: "Capital Humano",
        comissao: "Comissão de Avaliação",
        administracao: "Administração",
        admin: "Admin",
    };
    return mapa[role] || role;
}