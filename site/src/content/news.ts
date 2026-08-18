import { editionData } from "@/content/edition";

export type AstroNewsItem = {
  id: string;
  eyebrow: string;
  title: string;
  summary: string;
  detail: string;
};

export const astroNews: AstroNewsItem[] = [
  {
    id: "quinta-edicion-2027",
    eyebrow: "Edición 2027",
    title: "ASTRO SDQ confirma su quinta edición",
    summary: editionData.dates,
    detail:
      "La comunidad ASTRO vuelve a reunirse durante tres días dedicados al tatuaje, el intercambio creativo y el crecimiento de cada artista.",
  },
  {
    id: "sambil-santo-domingo",
    eyebrow: "Sede oficial",
    title: "Sambil Santo Domingo será el punto de encuentro",
    summary: editionData.venue,
    detail:
      "La nueva edición tendrá lugar en el salón de eventos de Sambil, en Santo Domingo.",
  },
  {
    id: "astro-match",
    eyebrow: "ASTRO Match",
    title: "Artistas y lienzos conectan antes del evento",
    summary: "Swipe · Match · Chat",
    detail:
      "ASTRO Match permite descubrir perfiles, conectar intereses y coordinar sesiones dentro de la comunidad ASTRO.",
  },
];
