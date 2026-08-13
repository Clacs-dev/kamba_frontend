// Normalização da resposta de /evaluations/{id}/comparison.
// O backend pode devolver duas formas ao longo das versões:
//  - antiga: auto/director com {objectives, competencies, values} NUMÉRICOS
//  - nova:   auto/director com {objectives[], competencies{}, values{}, scores{...}, final}
// Este normalizador garante que o frontend não rebenta com nenhuma das duas.

export interface Objetivo {
    description: string;
    weight: number;
    execution: number;
}

export interface LadoComparacao {
    objectives: Objetivo[];
    competencies: Record<string, number>;
    values: Record<string, boolean>;
    scores: { objectives: number | null; competencies: number | null; values: number | null };
    final: number | null;
    classification: string | null;
}

export interface Comparacao {
    collaborator_name: string | null;
    director_name: string | null;
    weights: { objectives: number; competencies: number; values: number };
    auto: LadoComparacao | null;
    director: LadoComparacao | null;
    final_score: number | null;
    classification: string | null;
    appeal_reason: string | null;
    appeal_deadline: string | null;
    commission_decision: string | null;
}

const num = (x: unknown): number | null => (typeof x === "number" && Number.isFinite(x) ? x : null);

export function normalizarLado(d: unknown): LadoComparacao | null {
    if (!d || typeof d !== "object") return null;
    const raw = d as Record<string, any>;
    const scores = (raw.scores && typeof raw.scores === "object" ? raw.scores : {}) as Record<string, unknown>;
    const comp = raw.competencies && typeof raw.competencies === "object" && !Array.isArray(raw.competencies)
        ? (raw.competencies as Record<string, number>)
        : {};
    const vals = raw.values && typeof raw.values === "object" && !Array.isArray(raw.values)
        ? (raw.values as Record<string, boolean>)
        : {};
    return {
        objectives: Array.isArray(raw.objectives) ? (raw.objectives as Objetivo[]) : [],
        competencies: comp,
        values: vals,
        scores: {
            objectives: num(scores.objectives) ?? num(raw.objectives),
            competencies: num(scores.competencies) ?? num(raw.competencies),
            values: num(scores.values) ?? num(raw.values),
        },
        final: num(raw.final) ?? num(scores.final) ?? null,
        classification: typeof raw.classification === "string" ? raw.classification : null,
    };
}

export function normalizarComparacao(d: unknown): Comparacao {
    const raw = (d ?? {}) as Record<string, any>;
    const w = (raw.weights && typeof raw.weights === "object" ? raw.weights : {}) as Record<string, unknown>;
    const peso = (x: unknown, fallback: number) => (typeof x === "number" ? x : fallback);
    return {
        collaborator_name: typeof raw.collaborator_name === "string" ? raw.collaborator_name : null,
        director_name: typeof raw.director_name === "string" ? raw.director_name : null,
        weights: {
            objectives: peso(w.objectives, 50),
            competencies: peso(w.competencies, 35),
            values: peso(w.values, 15),
        },
        auto: normalizarLado(raw.auto),
        director: normalizarLado(raw.director),
        final_score: num(raw.final_score),
        classification: typeof raw.classification === "string" ? raw.classification : null,
        appeal_reason: typeof raw.appeal_reason === "string" ? raw.appeal_reason : null,
        appeal_deadline: typeof raw.appeal_deadline === "string" ? raw.appeal_deadline : null,
        commission_decision: typeof raw.commission_decision === "string" ? raw.commission_decision : null,
    };
}
