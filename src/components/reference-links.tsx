import { ExternalLink } from "lucide-react";

export function ReferenceLinks({ title, metacriticUrl = "" }: { title: string; metacriticUrl?: string }) {
  const hltb = `https://howlongtobeat.com/?q=${encodeURIComponent(title)}`;
  const metacritic = metacriticUrl || `https://www.metacritic.com/search/${encodeURIComponent(title)}/?category=13`;
  return <div className="flex flex-wrap gap-2">
    <a href={hltb} target="_blank" rel="noreferrer" className="reference-link">HowLongToBeat <ExternalLink className="h-3.5 w-3.5" /></a>
    <a href={metacritic} target="_blank" rel="noreferrer" className="reference-link">Metacritic <ExternalLink className="h-3.5 w-3.5" /></a>
  </div>;
}
