import { ExternalLink, Clock3, Star } from "lucide-react";
import type { OneTimeGameRatings } from "@/lib/data/types";
import { positiveMainHours, ratingScore } from "@/lib/game-ratings.logic";

const duration = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1 });
export function ReferenceLinks({ title, ratings }: { title: string; ratings?: OneTimeGameRatings | null }) {
  const hltbHours = positiveMainHours(ratings?.hltb.mainHours);
  const metacriticScore = ratingScore(ratings?.metacritic.score);
  const hltb = hltbHours !== null && /^\d+$/.test(ratings?.hltb.gameId ?? "")
    ? `https://howlongtobeat.com/game/${ratings?.hltb.gameId}`
    : `https://howlongtobeat.com/?q=${encodeURIComponent(title)}`;
  const metacritic = metacriticScore !== null && ratings?.metacritic.url
    ? ratings.metacritic.url : `https://www.metacritic.com/search/${encodeURIComponent(title)}/?category=13`;
  return <div className="flex flex-wrap items-center gap-2">
    <a href={hltb} target="_blank" rel="noopener noreferrer" className="reference-link" title={hltbHours!==null?"HowLongToBeat — Main Story":"Procurar no HowLongToBeat"}>
      <Clock3 className="h-3.5 w-3.5" /> HowLongToBeat{hltbHours!==null?`: ${duration.format(hltbHours)} h`:""} <ExternalLink className="h-3.5 w-3.5" />
    </a>
    <a href={metacritic} target="_blank" rel="noopener noreferrer" className="reference-link" title={metacriticScore!==null?"Pontuação Metacritic — via RAWG":"Procurar no Metacritic"}>
      <Star className="h-3.5 w-3.5" /> Metacritic{metacriticScore!==null?`: ${metacriticScore}`:""} <ExternalLink className="h-3.5 w-3.5" />
    </a>
    {metacriticScore!==null&&ratings?.metacritic.rawgUrl&&<a href={ratings.metacritic.rawgUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-semibold text-current underline underline-offset-2 opacity-80" title="Dados Metacritic via RAWG">via RAWG</a>}
  </div>;
}
