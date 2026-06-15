// Curated drill spots. The "correct" answer is computed live from equity +
// pot odds (not hard-coded), so feedback stays principled.
export type Drill = {
  id: string;
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
    title: "Søppelhånd under press",
    prompt: "To spillere er allerede med, og det er høynet til deg. Verdt det?",
    hole: ["7d", "2c"],
    board: [],
    opponents: 2,
    potBb: 4,
    toCallBb: 3,
  },
  {
    id: "flush-draw",
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
    title: "Gutshot mot overbet",
    prompt:
      "Bare en indre straight-draw, og motstanderen overbetter — du må betale mer enn potten.",
    hole: ["Jd", "Td"],
    board: ["Ah", "Kc", "4s"],
    opponents: 1,
    potBb: 5,
    toCallBb: 8,
  },
  {
    id: "top-pair",
    title: "Topp par mot satsing",
    prompt: "Du traff topp par. Motstanderen satser halv pott.",
    hole: ["Ks", "Td"],
    board: ["Kh", "8c", "3d"],
    opponents: 1,
    potBb: 6,
    toCallBb: 3,
  },
  {
    id: "set-wet",
    title: "Sett på vått bord",
    prompt: "Du floppet sett, men bordet er fullt av draws og to er med.",
    hole: ["8c", "8d"],
    board: ["8h", "9c", "Tc"],
    opponents: 2,
    potBb: 7,
    toCallBb: 3,
  },
  {
    id: "nuts-river",
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
    title: "Svakt par på river",
    prompt: "Bare bunnpar igjen, og motstanderen fyrer av en stor river-bet.",
    hole: ["4h", "4d"],
    board: ["Ks", "9d", "2c", "8s", "Jh"],
    opponents: 1,
    potBb: 8,
    toCallBb: 9,
  },
];
