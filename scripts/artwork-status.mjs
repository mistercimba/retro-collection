import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const games = JSON.parse(await fs.readFile(path.join(ROOT, "data", "artwork-games.json"), "utf8"));
const manifestPath = path.join(ROOT, "public", "covers", "manifest.json");

let manifest = { entries: {} };
try {
  manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
} catch {}

let local = 0;
const missing = [];

for (const game of games) {
  const entry = manifest.entries?.[game.collectionId];
  if (!entry?.file) {
    missing.push(game);
    continue;
  }

  const localPath = path.join(ROOT, "public", entry.file.replace(/^\//, ""));
  try {
    await fs.access(localPath);
    local += 1;
  } catch {
    missing.push(game);
  }
}

console.log(`${games.length} jogos físicos atuais`);
console.log(`${local} com imagem local`);
console.log(`${missing.length} sem imagem local`);
console.log(`Fonte atual: ${manifest.source ?? "desconhecida"}`);

if (missing.length) {
  console.log("");
  for (const game of missing) {
    console.log(`- ${game.collectionId} | ${game.platform} | ${game.title}`);
  }
}
