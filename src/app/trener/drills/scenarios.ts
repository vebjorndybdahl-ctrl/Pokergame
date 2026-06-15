// Curated drill spots. The "correct" answer is computed live from equity +
// pot odds (range-aware vs a bettor), so feedback stays principled.
export type DrillConcept =
  | "Før floppen"
  | "Draws"
  | "Verdi"
  | "Tålmodighet";

export type Drill = {
  id: string;
  concept: DrillConcept;
  title: string;
  prompt: string;
  hole: [string, string];
  board: string[];
  opponents: number;
  potBb: number;
  toCallBb: number; // 0 = checked to you
};

export const DRILLS: Drill[] = [
  {
    id: "aa-preflop",
    concept: "Før floppen",
    title: "Premium før floppen",
    prompt: "Du sitter med esspar og en motstander har høynet. Hva gjør du?",
    hole: ["As", "Ad"],
    board: [],
    opponents: 1,
    potBb: 3,
    toCallBb: 2,
  },
  {
    id: "trash-preflop",
    concept: "Før floppen",
    title: "Søppelhånd under press",
    prompt: "To spillere er allerede med, og det er høynet til deg. Verdt det?",
    hole: ["7d", "2c"],
    board: [],
    opponents: 2,
    potBb: 4,
    toCallBb: 3,
  },
  {
    id: "small-pair",
    concept: "Før floppen",
    title: "Lommepar til billig pris",
    prompt: "Lite lommepar, og det er høynet smått til deg. Sett-jakt?",
    hole: ["5s", "5d"],
    board: [],
    opponents: 1,
    potBb: 4,
    toCallBb: 2,
  },
  {
    id: "dominated",
    concept: "Før floppen",
    title: "Dominert ess",
    prompt: "Ess med svak kicker, og en stram spiller høyner foran deg.",
    hole: ["Ad", "5c"],
    board: [],
    opponents: 1,
    potBb: 3,
    toCallBb: 2,
  },
  {
    id: "suited-connector",
    concept: "Før floppen",
    title: "Suited connector billig",
    prompt: "Sammenhengende kort i samme sort, og det koster nesten ingenting å se floppen.",
    hole: ["7h", "6h"],
    board: [],
    opponents: 1,
    potBb: 5,
    toCallBb: 1,
  },
  {
    id: "flush-draw",
    concept: "Draws",
    title: "Flush-draw med pris",
    prompt:
      "Du har nut-flush-draw og to overkort på floppen. Motstanderen satser smått.",
    hole: ["Ah", "Kh"],
    board: ["Qh", "7h", "2c"],
    opponents: 1,
    potBb: 6,
    toCallBb: 2,
  },
  {
    id: "gutshot",
    concept: "Draws",
    title: "Gutshot uten pris",
    prompt: "Bare en indre straight-draw, og motstanderen satser stort.",
    hole: ["Jd", "Td"],
    board: ["Ah", "Kc", "4s"],
    opponents: 1,
    potBb: 6,
    toCallBb: 4,
  },
  {
    id: "top-pair",
    concept: "Verdi",
    title: "Topp par mot satsing",
    prompt: "Du traff topp par. Motstanderen satser halv pott.",
    hole: ["Ks", "Td"],
    board: ["Kh", "8c", "3d"],
    opponents: 1,
    potBb: 6,
    toCallBb: 3,
  },
  {
    id: "top-pair-weak",
    concept: "Verdi",
    title: "Topp par, svak kicker",
    prompt: "Topp par men svak sidekort. Motstanderen satser.",
    hole: ["Kh", "7h"],
    board: ["Ks", "9c", "4d"],
    opponents: 1,
    potBb: 6,
    toCallBb: 3,
  },
  {
    id: "overpair",
    concept: "Verdi",
    title: "Overpar på tørt bord",
    prompt: "Damer er overpar til hele bordet. Motstanderen satser.",
    hole: ["Qs", "Qc"],
    board: ["9d", "6h", "2c"],
    opponents: 1,
    potBb: 6,
    toCallBb: 3,
  },
  {
    id: "two-pair",
    concept: "Verdi",
    title: "Topp to par",
    prompt: "Du floppet topp to par. Motstanderen satser stort.",
    hole: ["As", "Kd"],
    board: ["Ah", "Kc", "7s"],
    opponents: 1,
    potBb: 6,
    toCallBb: 4,
  },
  {
    id: "set-wet",
    concept: "Verdi",
    title: "Sett på vått bord",
    prompt: "Du floppet sett, men bordet er fullt av draws og to er med.",
    hole: ["8c", "8d"],
    board: ["8h", "9c", "Tc"],
    opponents: 2,
    potBb: 7,
    toCallBb: 3,
  },
  {
    id: "set-river-value",
    concept: "Verdi",
    title: "Sett på river — maksimer",
    prompt: "Du har sett på river, og det er sjekket til deg.",
    hole: ["7c", "7d"],
    board: ["7h", "Kd", "2s", "9c", "Js"],
    opponents: 1,
    potBb: 8,
    toCallBb: 0,
  },
  {
    id: "nuts-river",
    concept: "Verdi",
    title: "Nøttene på river",
    prompt: "Du har den beste mulige hånden, og det er sjekket til deg.",
    hole: ["6h", "5h"],
    board: ["9h", "8h", "7c", "2d", "4s"],
    opponents: 1,
    potBb: 10,
    toCallBb: 0,
  },
  {
    id: "weak-pair-river",
    concept: "Tålmodighet",
    title: "Svakt par på river",
    prompt: "Bare bunnpar igjen, og motstanderen fyrer av en stor river-bet.",
    hole: ["4h", "4d"],
    board: ["Ks", "9d", "2c", "8s", "Jh"],
    opponents: 1,
    potBb: 8,
    toCallBb: 6,
  },
  {
    id: "air-river",
    concept: "Tålmodighet",
    title: "Luft mot satsing",
    prompt: "Du bommet på alt, og motstanderen satser på river.",
    hole: ["6s", "5s"],
    board: ["Ah", "Kd", "Qc", "9h", "2s"],
    opponents: 1,
    potBb: 8,
    toCallBb: 5,
  },
];
