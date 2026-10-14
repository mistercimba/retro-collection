"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { platformSlug } from "@/lib/data/platforms";
import { getFreshLibrary, updateLibrary } from "@/lib/library-store";
import { acceptWishlistListGaps, suggestWishlistListGaps } from "@/lib/wishlist-list-suggestions.logic";

export async function addSelectedWishlistSuggestions(form: FormData) {
  if (!(await isAuthenticated())) throw new Error("Não autenticado.");
  const selection = form.getAll("candidate").filter(
    (value): value is string => typeof value === "string" && value.length > 0 && value.length < 256,
  );
  if (!selection.length || selection.length > 40) redirect("/want/suggestions");
  // Avoid a write when a user submits a now-invalid or obsolete selection.
  const fresh = await getFreshLibrary();
  const known = new Set(suggestWishlistListGaps(fresh).flatMap((item) =>
    item.sources.map((source) => source.reference)
  ));
  if (!selection.some((reference) => known.has(reference))) redirect("/want/suggestions");

  let count = 0;
  let newPlatforms: string[] = [];
  await updateLibrary((library) => {
    const result = acceptWishlistListGaps(library, selection, {
      now: new Date().toISOString(),
      nextId: () => "APP-" + crypto.randomUUID(),
      nextHistoryId: () => "H-" + crypto.randomUUID(),
    });
    count = result.added.length;
    newPlatforms = [...new Set(result.added.map((target) => target.platform))];
    return result.library;
  });

  if (count) {
    revalidatePath("/");
    revalidatePath("/want");
    revalidatePath("/history");
    revalidatePath("/search");
    revalidatePath("/want/suggestions");
    revalidatePath("/lists");
    for (const platform of newPlatforms) {
      revalidatePath("/platform/" + platformSlug(platform));
    }
  }
  redirect(count ? "/want/suggestions?added=" + count : "/want/suggestions");
}
