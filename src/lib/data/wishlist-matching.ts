import { platformSlug } from "./platforms";
import type { CollectionGame, WantTarget } from "./types";

export type PlanState = "active" | "inactive" | "unknown";
export type MatchState = "acquired" | "missing" | "ambiguous";

export function normalizeMatchText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-PT")
    .replace(/\[(?:platinum|classics|greatest hits|player's choice|nintendo selects|limited edition|special edition)[^\]]*\]/g, " ")
    .replace(/\((?:platinum|classics|greatest hits|player's choice|nintendo selects|limited edition|special edition)[^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

export function classifyPlanState(status: string): PlanState {
  const normalized = normalizeMatchText(status).toUpperCase();
  if (["PESQUISAR PRECO", "WATCH", "ACTIVE", "ATIVO"].includes(normalized)) return "active";
  if (/^(FORA DA BUYLIST|INATIVO|PAUSADO|CANCELADO|REMOVIDO|ADQUIRIDO|COMPRADO)( |$)/.test(normalized)) return "inactive";
  return "unknown";
}

function titleMatches(target: WantTarget, game: CollectionGame): boolean {
  const targetTitle = normalizeMatchText(target.title);
  return [game.title, game.audit?.title ?? "", game.audit?.localizedTitle ?? ""].some((title) => title && normalizeMatchText(title) === targetTitle);
}

function hasTargetId(target: WantTarget, game: CollectionGame): boolean {
  return Boolean(target.targetId && target.targetId.toUpperCase() !== "NOVO" && [game.collectionId, game.catalogId].includes(target.targetId));
}

function yesNo(value: string): "yes" | "no" | "unknown" {
  const normalized = normalizeMatchText(value);
  if (["yes", "sim", "true", "1"].includes(normalized)) return "yes";
  if (["no", "nao", "false", "0"].includes(normalized)) return "no";
  return "unknown";
}

function evaluateVariant(target: WantTarget, game: CollectionGame): "match" | "mismatch" | "unknown" {
  const requirement = target.targetVersion.trim();
  if (!requirement) return "unknown";
  let uncertain = false;
  let regionAccepted = false;

  let region = requirement.match(/\b(PAL(?:[- ]?[AB])?|NTSC(?:[- ]?[UJ])?)\b/i)?.[1]?.toUpperCase().replace(/ /g, "-") ?? null;
  const negativeEurope = /\b(sem|no|without)\b[^.;]{0,28}\b(europeu|europeia|european|pal)\b/i.test(requirement);
  if (region?.startsWith("PAL") && negativeEurope) region = null;
  if (!region && !negativeEurope && /\b(europeu|europeia|european)\b/i.test(requirement)) region = "PAL";
  if (!region && /\b(norte-americano|norte-americana|north american|usa)\b/i.test(requirement)) region = "NTSC-U";
  if (!region && /\b(japones|japonesa|japanese|JP)\b/i.test(requirement)) region = "NTSC-J";
  const acceptedVariants = requirement.match(/\b(US|AU|JP)\s*\/\s*(US|AU|JP)(?:\s*\/\s*(US|AU|JP))?\b/i);
  if (!region && acceptedVariants) {
    const accepted = acceptedVariants.slice(1).filter(Boolean).map((part) => String(part).toUpperCase());
    const sourceRegion = [game.region, game.audit?.region ?? ""].find((value) => value.trim() && normalizeMatchText(value) !== "unknown")?.toUpperCase().replace(/ /g, "-") ?? "";
    if (sourceRegion === "NTSC-U" && accepted.includes("US")) {
      // Exact North American variant confirmed.
      regionAccepted = true;
    } else if (sourceRegion === "NTSC-J" && accepted.includes("JP")) {
      // Exact Japanese variant confirmed.
      regionAccepted = true;
    } else if (sourceRegion === "NTSC") uncertain = true;
    else if (sourceRegion === "PAL" && accepted.includes("AU")) uncertain = true;
    else if (!sourceRegion || sourceRegion === "UNKNOWN") uncertain = true;
    else return "mismatch";
  }
  if (region) {
    const sourceRegion = [game.region, game.audit?.region ?? ""].find((value) => value.trim() && normalizeMatchText(value) !== "unknown") ?? "";
    const ownedRegion = sourceRegion.toUpperCase().replace(/ /g, "-");
    if (!ownedRegion || ownedRegion === "UNKNOWN") uncertain = true;
    else if (/^PAL(?:-[AB])?$/.test(region)) {
      if (!/^PAL(?:$|[- ])/.test(sourceRegion.toUpperCase())) return "mismatch";
      if (/^PAL-[AB]$/.test(region) && ownedRegion !== region) return "mismatch";
    } else if ((region === "NTSC-U" || region === "NTSC-J") && ownedRegion === "NTSC") uncertain = true;
    else if (ownedRegion !== region) return "mismatch";
  } else if (!regionAccepted) {
    uncertain = true;
  }

  const edition = normalizeMatchText(game.edition);
  const specificEdition = requirement.match(/\b(standard|platinum|classics|greatest hits|player'?s choice|nintendo selects|limited edition|special edition|collector'?s edition)\b/i)?.[1];
  if (specificEdition) {
    if (!edition || edition === "unknown") uncertain = true;
    else if (!edition.includes(normalizeMatchText(specificEdition))) {
      if (/preferid[oa]/i.test(requirement)) uncertain = true;
      else return "mismatch";
    }
  } else if (/\boriginal\b/i.test(requirement)) {
    if (!edition || edition === "unknown") uncertain = true;
    else if (/\b(platinum|classics|greatest hits|player'?s choice|nintendo selects|reprint)\b/.test(edition)) return "mismatch";
    else if (!edition.startsWith("standard")) uncertain = true;
  } else if (!edition || edition === "unknown") {
    uncertain = true;
  } else if (!/^standard(?: |$)/.test(edition)) {
    // A known alternate edition must not satisfy a target that does not name that edition.
    uncertain = true;
  }

  if (/\bblack label\b/i.test(requirement)) {
    const variantEvidence = `${game.edition} ${game.notes} ${game.audit?.auditNotes ?? ""} ${game.audit?.productCode ?? ""}`;
    if (!/black label/i.test(variantEvidence)) uncertain = true;
  }

  if (/\b(?:confirmar variante|confirm edition|variante confirmada)\b/i.test(requirement)) {
    if (!game.audit?.productCode || game.audit.auditStatus.trim().toLowerCase() !== "confirmed") uncertain = true;
  }

  const language = requirement.match(/\b(english|portuguese|french|german|spanish|italian|japanese|dutch|swedish|danish|finnish|norwegian)\b/i)?.[1];
  if (language) {
    const observed = game.audit?.observedLanguages.trim() ?? "";
    const collectionLanguage = game.language.trim();
    const evidence = observed || collectionLanguage;
    if (!evidence || /unknown|unverified|inferred|not confirmed/i.test(evidence)) uncertain = true;
    else if (!new RegExp(language, "i").test(evidence)) return "mismatch";
  }

  if (/\bautenticidade (?:confirmada|rigorosa)\b|\bauthenticity (?:confirmed|verified)\b/i.test(requirement)) {
    const evidence = `${game.notes} ${game.audit?.evidenceBasis ?? ""} ${game.audit?.auditNotes ?? ""}`;
    if (!/authenticity (?:confirmed|verified)|autenticidade (?:confirmada|verificada)/i.test(evidence)) uncertain = true;
  }

  const mediaValue = normalizeMatchText(game.media);
  const media = mediaValue && !["unknown", "desconhecido", "not recorded", "nao registado"].includes(mediaValue)
    ? (yesNo(game.media) === "no" ? "no" : "yes")
    : "unknown";
  if (media === "no") return "mismatch";
  if (media === "unknown") uncertain = true;

  const acceptsLoose = /\bloose\b[^.;]*\b(aceitavel|funcional|acceptable|ok)\b|\bloose\s*\/\s*cib\b|\bcib\s*\/\s*loose\b/i.test(requirement);
  if (/\b(cib|complete(?: in box)?|completo(?:a)?)\b/i.test(requirement) && !acceptsLoose) {
    for (const component of [game.box, game.manual]) {
      const present = yesNo(component);
      if (present === "no") return "mismatch";
      if (present === "unknown") uncertain = true;
    }
  }

  if (/\b(good|bom|excellent|mint)\b/i.test(requirement)) {
    const grade = normalizeMatchText(game.conditionGrade);
    if (!grade || grade === "unknown") uncertain = true;
    else if (["fair", "poor"].includes(grade)) return "mismatch";
  }

  if (/\b(funcional|working|tested|testado)\b/i.test(requirement)) {
    const functional = normalizeMatchText(game.audit?.functionalStatus ?? "");
    if (/^working(?:$| )/.test(functional) && !functional.includes("assumed")) {
      // Explicitly confirmed functional.
    } else if (["not working", "nao funciona", "broken"].includes(functional)) return "mismatch";
    else uncertain = true;
  }

  const code = requirement.match(/\b[A-Z]{2,4}-\d{1,4}(?:-[A-Z0-9]+)?\b/i)?.[0];
  if (code) {
    const physicalCodes = `${game.audit?.productCode ?? ""} ${game.edition} ${game.region}`.toUpperCase();
    if (!physicalCodes.trim()) uncertain = true;
    else if (!physicalCodes.includes(code.toUpperCase())) return "mismatch";
  }

  return uncertain ? "unknown" : "match";
}

function similarity(left: string, right: string): number {
  const a = new Set(normalizeMatchText(left).split(/\s+/).filter(Boolean));
  const b = new Set(normalizeMatchText(right).split(/\s+/).filter(Boolean));
  if (!a.size || !b.size) return 0;
  return [...a].filter((part) => b.has(part)).length / new Set([...a, ...b]).size;
}

export function matchWantTarget(target: WantTarget, games: CollectionGame[]) {
  const planState = classifyPlanState(target.status);
  const candidates = games.filter((game) => game.keepStatus === "Collection" && platformSlug(game.platform) === platformSlug(target.platform));
  const exact = candidates.filter((game) => titleMatches(target, game) || hasTargetId(target, game));

  if (planState === "inactive") return { planState, matchState: "missing" as const, ownedGame: null, possibleMatch: null, matchReason: "inactive-plan-target" };
  if (planState === "unknown") return { planState, matchState: "ambiguous" as const, ownedGame: null, possibleMatch: exact[0] ?? null, matchReason: "unknown-plan-state" };

  const matches = exact.filter((game) => evaluateVariant(target, game) === "match");
  if (matches.length) return { planState, matchState: "acquired" as const, ownedGame: matches[0], possibleMatch: null, matchReason: "variant-confirmed" };

  if (exact.length) {
    const assessments = exact.map((game) => evaluateVariant(target, game));
    const uncertain = assessments.some((assessment) => assessment === "unknown");
    const possibleIndex = uncertain ? assessments.findIndex((assessment) => assessment === "unknown") : 0;
    return {
      planState,
      matchState: uncertain ? "ambiguous" as const : "missing" as const,
      ownedGame: null,
      possibleMatch: exact[possibleIndex],
      matchReason: uncertain ? "variant-data-incomplete" : "owned-variant-does-not-match-target",
    };
  }

  const close = candidates.map((game) => ({ game, score: Math.max(similarity(game.title, target.title), similarity(game.audit?.localizedTitle ?? "", target.title)) }))
    .filter((entry) => entry.score >= 0.65).sort((a, b) => b.score - a.score);
  if (close.length) return { planState, matchState: "ambiguous" as const, ownedGame: null, possibleMatch: close[0].game, matchReason: "possible-title-match" };
  return { planState, matchState: "missing" as const, ownedGame: null, possibleMatch: null, matchReason: "no-title-match" };
}
