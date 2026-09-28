import fs from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import { GoogleAuth } from "google-auth-library";
import { buildGameMetadataSnapshot, isIGDBTitleEquivalent, normalizeIGDBTitle, resolveCollectionPlatform, resolveIGDBMatch, resolveIGDBMatchWithAliases } from "./igdb-refresh-logic.mjs";

const root = process.cwd();
const metadataPath = path.join(root, "src/data/game-metadata.json");
const reviewPath = path.join(root, "data/game-metadata-review.json");
const platformIds = {
  NES: 18,
  SNES: 19,
  "Nintendo 64": 4,
  GameCube: 21,
  "Nintendo Wii": 5,
  "Nintendo Wii U": 41,
  "Nintendo Switch": 130,
  "Game Boy": 33,
  "Game Boy Color": 22,
  "GameBoy Advance": 24,
  "Nintendo DS": 20,
  "Nintendo 3DS": 37,
  Playstation: 7,
  "Playstation 2": 8,
  "Playstation 3": 9,
  "Playstation 5": 167,
  PSP: 38,
  PC: 6,
};

function text(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("result" in value) return text(value.result);
    if ("text" in value) return String(value.text ?? "").trim();
    if ("richText" in value) return value.richText.map((part) => part.text).join("").trim();
  }
  return String(value).trim();
}

async function readCollectionWorkbook() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const fileId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!email || !privateKey || !fileId) throw new Error("Configura GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY e GOOGLE_SHEETS_SPREADSHEET_ID.");

  const auth = new GoogleAuth({
    credentials: { client_email: email, private_key: privateKey },
    scopes: ["https://www.googleapis.com/auth/drive.readonly", "https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  if (!token) throw new Error("Não foi possível autenticar no Google Drive.");

  const metaResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=mimeType,name`, { headers: { Authorization: `Bearer ${token}` } });
  if (!metaResponse.ok) throw new Error(`Google Drive respondeu ${metaResponse.status} ao ler os metadados do workbook.`);
  const meta = await metaResponse.json();
  const workbook = new ExcelJS.Workbook();
  if (meta.mimeType === "application/vnd.google-apps.spreadsheet") {
    const sheetsResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${fileId}?fields=sheets.properties.title`, { headers: { Authorization: `Bearer ${token}` } });
    if (!sheetsResponse.ok) throw new Error(`Google Sheets respondeu ${sheetsResponse.status} ao listar os separadores.`);
    const sheetNames = (await sheetsResponse.json()).sheets?.map((sheet) => sheet.properties?.title).filter(Boolean) ?? [];
    const wanted = sheetNames.filter((name) => ["COLLECTION", "GB", "GBC"].includes(name));
    if (!wanted.includes("COLLECTION")) throw new Error("A Google Sheet não contém o separador COLLECTION.");
    await Promise.all(wanted.map(async (name) => {
      const range = name === "COLLECTION" ? "A1:Z1200" : "A1:Z300";
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${fileId}/values/${encodeURIComponent(`'${name}'!${range}`)}?majorDimension=ROWS`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(`Google Sheets respondeu ${response.status} ao ler ${name}.`);
      const rows = (await response.json()).values ?? [];
      workbook.addWorksheet(name).addRows(rows);
    }));
  } else if (meta.mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    const fileResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, { headers: { Authorization: `Bearer ${token}` } });
    if (!fileResponse.ok) throw new Error(`Google Drive respondeu ${fileResponse.status} ao descarregar o workbook.`);
    await workbook.xlsx.load(Buffer.from(await fileResponse.arrayBuffer()));
  } else {
    throw new Error(`Formato de workbook não suportado para refresh de metadata (${meta.mimeType ?? "desconhecido"}).`);
  }
  const sheet = workbook.getWorksheet("COLLECTION");
  if (!sheet) throw new Error("O workbook não contém o separador COLLECTION.");
  const rows = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    rows.push(Array.from({ length: sheet.columnCount }, (_, index) => text(row.getCell(index + 1).value)));
  });
  const [headers = [], ...dataRows] = rows;
  const records = dataRows.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
  const platformOverrides = {};
  for (const [sheetName, platform] of [["GB", "Game Boy"], ["GBC", "Game Boy Color"]]) {
    const planSheet = workbook.getWorksheet(sheetName);
    if (!planSheet) continue;
    planSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber < 6) return;
      const collectionId = text(row.getCell(2).value);
      if (collectionId) platformOverrides[collectionId] = platform;
    });
  }
  return records.filter((row) => row["Keep Status"] === "Collection" && (!row["Item Type"] || row["Item Type"] === "Game"))
    .filter((row) => row["Collection ID"] && row.Title)
    .map((row) => ({ ...row, Platform: resolveCollectionPlatform(row["Collection ID"], row.Platform, platformOverrides) }));
}

async function getIGDBToken() {
  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Configura IGDB_CLIENT_ID e IGDB_CLIENT_SECRET no ambiente local antes de atualizar metadata.");
  const body = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials" });
  const response = await fetch("https://id.twitch.tv/oauth2/token", { method: "POST", body });
  if (!response.ok) throw new Error(`Twitch OAuth respondeu ${response.status}.`);
  const result = await response.json();
  return result.access_token;
}

let lastIGDBRequestAt = 0;
async function waitForIGDBRateLimit() {
  const interval = 260;
  const delay = interval - (Date.now() - lastIGDBRequestAt);
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
  lastIGDBRequestAt = Date.now();
}

async function searchIGDB({ title, clientId, accessToken }) {
  const escapedTitle = title.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  const query = [
    "fields id,name,summary,first_release_date,genres.name,game_modes.name,themes.name,player_perspectives.name,",
    "aggregated_rating,aggregated_rating_count,rating,rating_count,platforms.id,platforms.name,",
    "involved_companies.developer,involved_companies.publisher,involved_companies.company.name;",
    `search \"${escapedTitle}\"; limit 25;`,
  ].join(" ");
  await waitForIGDBRateLimit();
  const response = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: { "Client-ID": clientId, Authorization: `Bearer ${accessToken}`, Accept: "application/json", "Content-Type": "text/plain" },
    body: query,
  });
  if (!response.ok) throw new Error(`IGDB respondeu ${response.status} para ${title}.`);
  return response.json();
}

async function searchIGDBAliases({ title, clientId, accessToken }) {
  const escapedTitle = title.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  await waitForIGDBRateLimit();
  const response = await fetch("https://api.igdb.com/v4/search", {
    method: "POST",
    headers: { "Client-ID": clientId, Authorization: `Bearer ${accessToken}`, Accept: "application/json", "Content-Type": "text/plain" },
    body: `fields alternative_name,game; search "${escapedTitle}"; limit 50;`,
  });
  if (!response.ok) throw new Error(`IGDB respondeu ${response.status} ao pesquisar aliases para ${title}.`);
  const searchResults = await response.json();
  const aliases = (Array.isArray(searchResults) ? searchResults : [])
    .filter((entry) => typeof entry.alternative_name === "string" && Number.isInteger(entry.game))
    .filter((entry) => isIGDBTitleEquivalent(title, entry.alternative_name));
  const gameIds = [...new Set(aliases.map((entry) => entry.game))];
  if (!gameIds.length) return [];

  await waitForIGDBRateLimit();
  const gameResponse = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: { "Client-ID": clientId, Authorization: `Bearer ${accessToken}`, Accept: "application/json", "Content-Type": "text/plain" },
    body: `fields id,name,platforms.id,platforms.name; where id = (${gameIds.join(",")}); limit ${gameIds.length};`,
  });
  if (!gameResponse.ok) throw new Error(`IGDB respondeu ${gameResponse.status} ao resolver jogos associados a aliases de ${title}.`);
  const gamesById = new Map((await gameResponse.json()).map((game) => [game.id, game]));
  return aliases.flatMap((entry) => {
    const game = gamesById.get(entry.game);
    return game ? [{ name: entry.alternative_name, game }] : [];
  });
}

function formatPlaytime(seconds) {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return "";
  const hours = Math.round(seconds / 3600);
  if (hours < 1) return "< 1 h";
  const weeks = Math.floor(hours / 168);
  const days = Math.floor((hours % 168) / 24);
  const remainder = hours % 24;
  return [weeks ? `${weeks} sem.` : "", days ? `${days} d` : "", remainder ? `${remainder} h` : ""].filter(Boolean).join(" ");
}

async function getIGDBPlaytime(gameId, clientId, accessToken) {
  await waitForIGDBRateLimit();
  const response = await fetch("https://api.igdb.com/v4/game_time_to_beats", {
    method: "POST",
    headers: { "Client-ID": clientId, Authorization: `Bearer ${accessToken}`, Accept: "application/json", "Content-Type": "text/plain" },
    body: `fields hastily,normally,completely; where game_id = ${gameId}; limit 1;`,
  });
  if (!response.ok) return { main: "", extras: "", completionist: "" };
  const [time] = await response.json();
  return { main: formatPlaytime(time?.hastily), extras: formatPlaytime(time?.normally), completionist: formatPlaytime(time?.completely) };
}

const RAWG_PLATFORMS = {
  Playstation: ["PlayStation"], "Playstation 2": ["PlayStation 2"], "Playstation 3": ["PlayStation 3"], "Playstation 5": ["PlayStation 5"],
  "Nintendo Switch": ["Nintendo Switch"], "Nintendo Wii": ["Wii"], "Nintendo Wii U": ["Wii U"], PC: ["PC"],
};

async function getRawgMetascore(title, platform) {
  const key = process.env.RAWG_API_KEY;
  const platforms = RAWG_PLATFORMS[platform];
  if (!key || !platforms) return { value: null, source: "indisponível", url: "" };
  const params = new URLSearchParams({ search: title, page_size: "40", search_exact: "true", search_precise: "true", key });
  let searchResponse;
  try { searchResponse = await fetch(`https://api.rawg.io/api/games?${params}`); } catch { return { value: null, source: "indisponível", url: "" }; }
  if (!searchResponse.ok) return { value: null, source: "indisponível", url: "" };
  const payload = await searchResponse.json();
  const normalize = (value) => String(value ?? "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const matches = (payload.results ?? []).filter((game) => normalize(game.name) === normalize(title) && (game.platforms ?? []).some((entry) => platforms.includes(entry.platform?.name)));
  const unique = [...new Map(matches.map((game) => [game.id, game])).values()];
  if (unique.length !== 1) return { value: null, source: "indisponível", url: "" };
  let detailResponse;
  try { detailResponse = await fetch(`https://api.rawg.io/api/games/${unique[0].id}?key=${encodeURIComponent(key)}`); } catch { return { value: null, source: "indisponível", url: "" }; }
  if (!detailResponse.ok) return { value: null, source: "indisponível", url: "" };
  const detail = await detailResponse.json();
  const entries = (detail.metacritic_platforms ?? []).filter((entry) => platforms.includes(entry.platform?.name) && Number.isFinite(entry.metascore));
  if (entries.length === 1) return { value: entries[0].metascore, source: "RAWG / Metacritic", url: entries[0].url ?? detail.metacritic_url ?? "" };
  return entries.length === 0 && Number.isFinite(detail.metacritic) && (detail.platforms ?? []).length === 1
    ? { value: detail.metacritic, source: "RAWG / Metacritic", url: detail.metacritic_url ?? "" }
    : { value: null, source: "indisponível", url: "" };
}

const CURATED_QUERY_ALIASES = {
  "Terminator 2: Judgement Day": ["Terminator 2: Judgment Day"],
  "Teenage Mutant Hero Turtles": ["Teenage Mutant Ninja Turtles"],
  "Street Fighter II: The World Warrior": ["Street Fighter 2: The World Warrior"],
  "Lylat Wars": ["Star Fox 64"],
  "Pokemon Crystal": ["Pokémon Crystal Version"],
  "Pokemon Gold": ["Pokémon Gold Version"],
  "Pokemon Yellow": ["Pokémon Yellow Version: Special Pikachu Edition"],
  "Zelda Oracle Of Ages": ["The Legend of Zelda: Oracle of Ages"],
  "Pokemon Red": ["Pokémon Red Version"],
  "Pokemon Silver": ["Pokémon Silver Version"],
  "Pokemon Blue": ["Pokémon Blue Version"],
  "Zelda Link's Awakening": ["The Legend of Zelda: Link's Awakening"],
  "Super Mario Land 2": ["Super Mario Land 2: 6 Golden Coins"],
  "Harvest Moon": ["Harvest Moon GB"],
  "Harry Potter And The Philosopher's Stone": ["Harry Potter and the Philosopher's Stone"],
  "Bugs Bunny Crazy Castle 4": ["The Bugs Bunny Crazy Castle 4"],
  "Sylvester & Tweety Breakfast On The Run": ["Sylvester & Tweety: Breakfast on the Run"],
  "Bugs Bunny & Lola Bunny Operation Carrot Patch": ["Bugs Bunny & Lola Bunny: Operation Carrot Patch"],
  "Atlantis The Lost Empire": ["Atlantis: The Lost Empire"],
  "Pokémon Emerald": ["Pokémon Emerald Version"],
  "Ninja Cop": ["Ninja Five-O"],
  "Pokémon FireRed": ["Pokémon FireRed Version"],
  "Pokémon LeafGreen": ["Pokémon LeafGreen Version"],
  "Pokémon Sapphire": ["Pokémon Sapphire Version"],
  "Pokémon Ruby": ["Pokémon Ruby Version"],
  "Game & Watch Gallery Advance": ["Game & Watch Gallery 4"],
  "Super Mario Advance 2": ["Super Mario World: Super Mario Advance 2"],
  "Yu-Gi-Oh Ultimate Masters Edition": ["Yu-Gi-Oh! Ultimate Masters: World Championship Tournament 2006"],
  "Excitebike NES Classics": ["Excitebike"],
  "Lord of the Rings: Return of the King": ["The Lord of the Rings: The Return of the King"],
  "ESPN Winter X-Games Snowboarding 2": ["ESPN Winter X-Games Snowboarding 2002"],
  "Donkey Kong NES Classics": ["Donkey Kong"],
  "Spiderman: Mysterio's Menace": ["Spider-Man: Mysterio's Menace"],
  "Lilo & Stitch 2": ["Lilo & Stitch 2: Haemsterviel Havoc"],
  "Crash And Spyro Super Pack Volume 2": ["Crash & Spyro Super Pack: Volume 2"],
  "Lord Of The Rings Two Towers": ["The Lord of the Rings: The Two Towers"],
  "Zelda NES Classics": ["The Legend of Zelda"],
  "Flower, Sun and Rain": ["Flower, Sun, and Rain"],
  "Pokémon SoulSilver": ["Pokémon SoulSilver Version"],
  "Pokémon Platinum": ["Pokémon Platinum Version"],
  "Pokémon White": ["Pokémon White Version"],
  "Pokémon Diamond": ["Pokémon Diamond Version"],
  "Professor Layton and the Lost Future": ["Professor Layton and the Unwound Future"],
  "Professor Layton and the Spectre's Call": ["Professor Layton and the Last Specter"],
  "Pokemon Box": ["Pokémon Box: Ruby & Sapphire"],
  "Game Boy Player Start-Up Disc": ["Game Boy Player"],
  "Zelda Wind Waker": ["The Legend of Zelda: The Wind Waker"],
  "Eternal Darkness": ["Eternal Darkness: Sanity's Requiem"],
  "Digimon World 2003": ["Digimon World 3"],
  "Hercules": ["Disney's Hercules"],
  "Toy Story 2": ["Toy Story 2: Buzz Lightyear to the Rescue"],
  "Driver 2": ["Driver 2: Back on the Streets"],
  "Donald Duck Quack Attack": ["Donald Duck: Quack Attack"],
  "MediEvil 2": ["MediEvil II"],
  "Tarzan": ["Disney's Tarzan"],
  "Ridge Racer Type 4": ["R4: Ridge Racer Type 4"],
  "Tony Hawk's Skateboarding": ["Tony Hawk's Pro Skater"],
  "Jungle Book Groove Party": ["The Jungle Book: Rhythm n' Groove"],
  "Harry Potter e a Pedra Filosofal": ["Harry Potter and the Philosopher's Stone"],
  "Oddworld: Abe's Oddysee DEMO": ["Oddworld: Abe's Oddysee"],
  "Crash Bandicoot 3: Warped": ["Crash Bandicoot: Warped"],
  "Advanced Dungeons & Dragons: Iron & Blood – Warriors of Ravenloft": ["Iron & Blood: Warriors of Ravenloft"],
  "Project Zero 3": ["Fatal Frame III: The Tormented"],
  "Nightmare Before Christmas: Oogie's Revenge": ["The Nightmare Before Christmas: Oogie's Revenge"],
  "Metal Gear Solid 2": ["Metal Gear Solid 2: Sons of Liberty"],
  "Zone Of The Enders 2nd Runner": ["Zone of the Enders: The 2nd Runner"],
  "Shadow of Memories": ["Shadow of Destiny"],
  "Beyond Good And Evil": ["Beyond Good & Evil"],
  "Canis Canem Edit": ["Bully"],
  "God Of War 2": ["God of War II"],
  "Final Fantasy VII Dirge Of Cerberus": ["Dirge of Cerberus: Final Fantasy VII"],
  "Devil May Cry 3": ["Devil May Cry 3: Dante's Awakening"],
  "Yu-Gi-Oh Duelists Of The Roses": ["Yu-Gi-Oh! The Duelists of the Roses"],
  "Ratchet: Gladiator": ["Ratchet & Clank: Deadlocked"],
  "Kuri Kuri Mix": ["We Love Katamari"],
  "Time Splitters": ["TimeSplitters 2"],
  "Future Tactics": ["Future Tactics: The Uprising"],
  "Black": ["Black"],
  "Buzz o Grande Quiz": ["Buzz! The Big Quiz"],
  "International Superstar Soccer": ["International Superstar Soccer 2"],
  "Formula One 2005": ["Formula One 05"],
  "Splinter Cell": ["Tom Clancy's Splinter Cell"],
  "WRC: World Rally Championship": ["WRC: World Rally Championship"],
  "Bionicle": ["Bionicle"],
  "Tourist Trophy: The Real Riding Simulator": ["Tourist Trophy: The Real Riding Simulator"],
  "Mundial 2002 Challenge": ["2002 FIFA World Cup"],
  "Freak Out": ["Freak Out"],
  "Ace Combat: Distant Thunder": ["Ace Combat 04: Shattered Skies"],
  "SpongeBob SquarePants: The Movie": ["The SpongeBob SquarePants Movie"],
  "1945 I&II: The Arcade Games": ["1945 I & II: The Arcade Games"],
  "Winnie the Pooh's Rumbly Tumbly Adventure": ["Winnie the Pooh's Rumbly Tumbly Adventure"],
  "Disney's Peter Pan: The Legend of Never-Land": ["Peter Pan: The Legend of Never Land"],
  "Disney's Tarzan Freeride": ["Disney's Tarzan: Freeride"],
  "LEGO Football Mania": ["LEGO Football Mania"],
  "Elder Scrolls V: Skyrim": ["The Elder Scrolls V: Skyrim"],
  "Harry Potter Prisoner of Azkaban": ["Harry Potter and the Prisoner of Azkaban"],
  "The Sims 2: Glamor Life Stuff": ["The Sims 2: Glamour Life Stuff"],
  "Super Mario Kart": ["Super Mario Kart (1992)"],
  "Street Fighter II: The World Warrior": ["Street Fighter II"],
  "Harry Potter And The Philosopher's Stone": ["Harry Potter and the Philosopher's Stone (Game Boy Color)"],
  "Golden Goal": ["Golden Goal!"],
  "Atlantis The Lost Empire": ["Atlantis: The Lost Empire (2001)"],
  "Lilo & Stitch 2": ["Lilo & Stitch 2: Hämsterviel Havoc"],
  "Game Boy Player Start-Up Disc": ["Game Boy Player Startup Disc"],
  "Demo One": ["Demo 1"],
  "Ratchet: Gladiator": ["Ratchet & Clank: Gladiator"],
  "Black": ["Black (2006)"],
  "Formula One 2005": ["Formula One 05"],
  "WRC: World Rally Championship": ["World Rally Championship"],
  "Bionicle": ["Bionicle: The Game"],
  "Freak Out": ["Stretch Panic"],
};

const PREFERRED_MATCH_IDS = {
  "Super Mario Bros. 3|NES": 1068,
  "Pikmin|GameCube": 2239,
};

async function resolveIGDBRecord({ title, platform, clientId, accessToken }) {
  const queryTitles = [title, ...(CURATED_QUERY_ALIASES[title] ?? [])];
  const candidateLists = await Promise.all(queryTitles.map((queryTitle) => searchIGDB({ title: queryTitle, clientId, accessToken })));
  const candidates = [...new Map(candidateLists.flat().map((candidate) => [candidate.id, candidate])).values()];
  const preferredId = PREFERRED_MATCH_IDS[`${title}|${platform}`];
  const preferred = preferredId ? candidates.find((candidate) => candidate.id === preferredId && candidate.platforms?.some((entry) => entry.id === platformIds[platform])) : null;
  if (preferred) return { status: "matched", candidate: preferred, candidates: [preferred], matchMethod: "alias", relevantAliases: [] };
  const direct = resolveIGDBMatch(title, platform, candidates, platformIds);
  if (direct.status === "matched") return { ...direct, matchMethod: "title", relevantAliases: [] };
  const aliases = await searchIGDBAliases({ title, clientId, accessToken });
  const curatedAliases = queryTitles.slice(1).flatMap((queryTitle) => candidates.filter((candidate) => candidate.name && isIGDBTitleEquivalent(candidate.name, queryTitle)).map((game) => ({ name: title, game })));
  return resolveIGDBMatchWithAliases(title, platform, candidates, [...aliases, ...curatedAliases], platformIds);
}

const records = await readCollectionWorkbook();
const groups = new Map();
for (const record of records) {
  const key = `${record.Platform}|${normalizeIGDBTitle(record.Title)}`;
  const group = groups.get(key) ?? { title: record.Title, platform: record.Platform, records: [] };
  group.records.push(record);
  groups.set(key, group);
}

const clientId = process.env.IGDB_CLIENT_ID;
const accessToken = await getIGDBToken();
const needsReview = [];
const resolvedGroups = [];
let matched = 0;
let ambiguous = 0;
let unmatched = 0;
let refreshed = 0;
let matchedWithGenre = 0;
let matchedWithDeveloper = 0;
let matchedWithPublisher = 0;
let matchedWithCriticRating = 0;
let aliasResolved = 0;
const unresolvedReasonCounts = {};
for (const group of groups.values()) {
  const result = platformIds[group.platform]
    ? await resolveIGDBRecord({ ...group, clientId, accessToken })
    : { status: "unmatched", candidate: null, candidates: [], reason: "unsupported-platform" };
  const refreshedAt = new Date().toISOString();
  if (result.status === "matched") {
    const candidate = result.candidate;
    const involved = candidate.involved_companies ?? [];
    const playtime = await getIGDBPlaytime(candidate.id, clientId, accessToken);
    const rawgScore = await getRawgMetascore(candidate.name, group.platform);
    const fallbackScore = rawgScore.value ?? (typeof candidate.aggregated_rating === "number" ? candidate.aggregated_rating : null);
    const metadata = {
      source: "IGDB",
      sourceGameId: candidate.id,
      externalIds: { igdb: candidate.id },
      playtime,
      reviewScore: fallbackScore,
      reviewScoreSource: rawgScore.value !== null ? rawgScore.source : fallbackScore !== null ? "IGDB aggregated rating" : "indisponível",
      reviewScoreUrl: rawgScore.url,

      title: candidate.name,
      summary: candidate.summary ?? "",
      firstReleaseDate: candidate.first_release_date ? new Date(candidate.first_release_date * 1000).toISOString().slice(0, 10) : "",
      genres: (candidate.genres ?? []).map((entry) => entry.name),
      gameModes: (candidate.game_modes ?? []).map((entry) => entry.name),
      themes: (candidate.themes ?? []).map((entry) => entry.name),
      perspectives: (candidate.player_perspectives ?? []).map((entry) => entry.name),
      developers: involved.filter((entry) => entry.developer).map((entry) => entry.company?.name).filter(Boolean),
      publishers: involved.filter((entry) => entry.publisher).map((entry) => entry.company?.name).filter(Boolean),
      aggregatedRating: candidate.aggregated_rating ?? null,
      aggregatedRatingCount: candidate.aggregated_rating_count ?? 0,
      userRating: candidate.rating ?? null,
      userRatingCount: candidate.rating_count ?? 0,
      refreshedAt: new Date().toISOString(),
    };
    result.metadata = metadata;
    matched += group.records.length;
    if (candidate.genres?.length) matchedWithGenre += group.records.length;
    if (metadata.developers.length) matchedWithDeveloper += group.records.length;
    if (metadata.publishers.length) matchedWithPublisher += group.records.length;
    if (rawgScore.value !== null || fallbackScore !== null) matchedWithCriticRating += group.records.length;
    if (result.matchMethod === "alias") aliasResolved += group.records.length;
  } else {
    if (result.status === "ambiguous") ambiguous += group.records.length;
    else unmatched += group.records.length;
    needsReview.push({
      platform: group.platform,
      title: group.title,
      collectionIds: group.records.map((record) => record["Collection ID"]),
      reason: result.reason,
      candidates: result.candidates.map((game) => ({ id: game.id, name: game.name, platforms: (game.platforms ?? []).map((entry) => entry.name) })),
      relevantAliases: (result.relevantAliases ?? []).map((alias) => ({
        name: alias.name,
        gameId: alias.game.id,
        gameTitle: alias.game.name,
        platforms: (alias.game.platforms ?? []).map((entry) => entry.name),
      })),
    });
    unresolvedReasonCounts[result.reason] = (unresolvedReasonCounts[result.reason] ?? 0) + group.records.length;
  }
  resolvedGroups.push({ collectionIds: group.records.map((record) => record["Collection ID"]), result, refreshedAt });
  refreshed += 1;
  if (refreshed % 20 === 0) console.log(`IGDB: ${refreshed}/${groups.size} títulos verificados (${matched} cópias associadas).`);
  if (platformIds[group.platform]) await new Promise((resolve) => setTimeout(resolve, 280));
}

const gamesById = buildGameMetadataSnapshot(resolvedGroups);
await fs.writeFile(metadataPath, `${JSON.stringify({ schemaVersion: 2, refreshedAt: new Date().toISOString(), games: gamesById }, null, 2)}\n`);
await fs.writeFile(reviewPath, `${JSON.stringify(needsReview, null, 2)}\n`);
console.log(`Metadata IGDB atualizada: ${matched} correspondências; ${ambiguous} ambiguidades; ${unmatched} sem correspondência (${needsReview.length} grupos para rever).`);
console.log("Cobertura IGDB:");
console.log(JSON.stringify({
  totalCopies: records.length,
  matched,
  ambiguous,
  unmatched,
  matchedWithGenre,
  matchedWithDeveloper,
  matchedWithPublisher,
  matchedWithIGDBCriticRating: matchedWithCriticRating,
  resolvedThroughAlias: aliasResolved,
  unresolvedByReason: unresolvedReasonCounts,
}, null, 2));
