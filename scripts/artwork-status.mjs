import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const games = JSON.parse(await fs.readFile(path.join(ROOT, "data", "artwork-games.json"), "utf8"));
const coversDir = path.join(ROOT, "public", "covers");

let local = 0;
const missing = [];

for (const game of games) {
  try {
    await fs.access(path.join(coversDir, `${game.collectionId}.png`));
    local += 1;
  } catch {
    missing.push(game);
  }
}

console.log(`${games.length} jogos físicos atuais`);
console.log(`${local} com imagem local`);
console.log(`${missing.length} sem imagem local`);

if (missing.length) {
  console.log("");
  for (const game of missing) {
    console.log(`- ${game.collectionId} | ${game.platform} | ${game.title}`);
  }
}
