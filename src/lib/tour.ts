/**
 * Estado do tour de primeiro acesso.
 *
 * Guarda no localStorage se o usuário já viu o tour. Um "?" no topo da Home
 * permite reabrir o tutorial a qualquer momento (e nunca mais marcar como visto
 * sozinho: reabrir por botão não esconde no futuro, só a conclusão das etapas).
 */

const TOUR_SEEN_KEY = "caixa_tour_seen_v1";

export function hasSeenTour(): boolean {
  try {
    return localStorage.getItem(TOUR_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markTourSeen(): void {
  try {
    localStorage.setItem(TOUR_SEEN_KEY, "1");
  } catch {
    /* storage bloqueado */
  }
}

export function clearTourSeen(): void {
  try {
    localStorage.removeItem(TOUR_SEEN_KEY);
  } catch {
    /* storage bloqueado */
  }
}