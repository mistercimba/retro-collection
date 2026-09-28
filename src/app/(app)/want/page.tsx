import { WantlistBrowser } from "@/components/wantlist-browser";
import { getWantlist } from "@/lib/data/collection-service";
import { searchParamsToString } from "@/lib/list-url-state.logic";

export const metadata = { title: "À procura" };

export default async function WantPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [targets, query] = await Promise.all([getWantlist(), searchParams]);
  return <WantlistBrowser targets={targets} initialSearch={searchParamsToString(query)} />;
}
