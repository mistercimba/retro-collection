const apiKey = process.env.THEGAMESDB_API_KEY;
if (!apiKey) throw new Error("THEGAMESDB_API_KEY is not configured");

const base = "https://api.thegamesdb.net";

async function get(endpoint, params = {}) {
  const url = new URL(endpoint, base);
  url.searchParams.set("apikey", apiKey);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "MarioRetroCollection/1.0" } });
  const text = await response.text();
  if (!response.ok) throw new Error(`${endpoint} returned ${response.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

function safeGame(game) {
  if (!game) return null;
  return Object.fromEntries(
    Object.entries(game).filter(([key]) => !/key|token|password|secret/i.test(key)),
  );
}

const limit = await get("/v1/API/Limit");
console.log("LIMIT", JSON.stringify({
  code: limit.code,
  status: limit.status,
  remaining_monthly_allowance: limit.remaining_monthly_allowance,
  extra_allowance: limit.extra_allowance,
}, null, 2));

const platforms = await get("/v1/Platforms");
const listRaw = platforms?.data?.platforms ?? {};
const platformList = Array.isArray(listRaw) ? listRaw : Object.values(listRaw);
const wanted = platformList.filter((p) => /nintendo 64|playstation 2|game boy advance/i.test(p?.name ?? ""));
console.log("PLATFORMS", JSON.stringify(wanted, null, 2));

const n64 = platformList.find((p) => /nintendo 64/i.test(p?.name ?? ""));
if (!n64) throw new Error("Nintendo 64 platform not found");

for (const title of ["Lylat Wars", "Star Fox 64"]) {
  const payload = await get("/v1.1/Games/ByGameName", {
    name: title,
    "filter[platform]": n64.id,
    fields: "platform,alternates",
    include: "boxart,platform",
  });
  console.log(`SEARCH ${title}`, JSON.stringify({
    code: payload.code,
    status: payload.status,
    gameKeys: Object.keys(payload?.data?.games?.[0] ?? {}),
    games: (payload?.data?.games ?? []).slice(0, 5).map(safeGame),
    boxartBase: payload?.include?.boxart?.base_url ?? null,
    boxart: payload?.include?.boxart?.data ?? null,
  }, null, 2));
}

// probe-version: 2
