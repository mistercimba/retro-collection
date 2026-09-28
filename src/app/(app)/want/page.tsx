import { WantlistBrowser } from "@/components/wantlist-browser";
import { getWantlist } from "@/lib/data/collection-service";

export const metadata = { title: "À procura" };

export default async function WantPage() {
  const targets = await getWantlist();
  return <WantlistBrowser targets={targets} />;
}
