import { ArrowUpRight, Clock3, ExternalLink, Search } from "lucide-react";
import { displayPlatform } from "@/lib/data/platforms";

type MarketSearchLinksProps = { title: string; platform: string; compact?: boolean };

function buildSearchLinks(title: string, platform: string) {
  const query = `${title} ${displayPlatform(platform)}`.trim();
  const encoded = encodeURIComponent(query);
  const google = (site: string, extra = "") =>
    `https://www.google.com/search?q=${encodeURIComponent(`site:${site} ${query} ${extra}`.trim())}`;
  return [
    { label: "PriceCharting", href: `https://www.pricecharting.com/search-products?type=videogames&q=${encoded}`, kind: "price" },
    { label: "CeX Portugal", href: google("pt.webuy.com/products", "jogo preço"), kind: "price" },
    { label: "Vinted", href: `https://www.vinted.pt/catalog?search_text=${encoded}`, kind: "market" },
    { label: "OLX", href: `https://www.olx.pt/ads/q/${encodeURIComponent(title.trim()).replace(/%20/g, "-")}/`, kind: "market" },
    { label: "eBay vendidos", href: `https://www.ebay.co.uk/sch/i.html?_nkw=${encoded}&LH_Sold=1&LH_Complete=1`, kind: "market" },
    { label: "HowLongToBeat", href: `https://howlongtobeat.com/?q=${encodeURIComponent(title)}`, kind: "time" },
    { label: "Metacritic", href: google("metacritic.com/game", "Metascore"), kind: "editorial" },
    { label: "IGDB", href: google("igdb.com/games", "genre rating"), kind: "editorial" },
  ];
}

export function MarketSearchLinks({ title, platform, compact = false }: MarketSearchLinksProps) {
  const links = buildSearchLinks(title, platform);
  return (
    <div className={compact ? "market-link-grid market-link-grid-compact" : "market-link-grid"}>
      {links.map((link) => (
        <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="market-link">
          <span className="market-link-icon">
            {link.kind === "time" ? <Clock3 className="h-4 w-4" /> : link.kind === "price" ? <Search className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
          </span>
          <span className="min-w-0 flex-1"><span className="block truncate">{link.label}</span><span className="market-link-kind">{link.kind === "price" ? "referência de preço" : link.kind === "time" ? "tempo de jogo" : link.kind === "editorial" ? "ficha e críticas" : "anúncios atuais"}</span></span>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400" />
        </a>
      ))}
    </div>
  );
}
