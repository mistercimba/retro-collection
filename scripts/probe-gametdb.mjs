const urls = [
  "https://www.gametdb.com/wiitdb.txt?LANG=EN",
  "https://www.gametdb.com/dstdb.txt?LANG=EN",
  "https://www.gametdb.com/3dstdb.txt?LANG=EN",
  "https://www.gametdb.com/wiiutdb.txt?LANG=EN",
  "https://www.gametdb.com/switchtdb.txt?LANG=EN",
  "https://www.gametdb.com/ps3tdb.txt?LANG=EN",
];

for (const url of urls) {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "MarioRetroCollection/1.0" },
      redirect: "follow",
    });
    const text = await response.text();
    console.log("\nURL", url);
    console.log("STATUS", response.status, response.headers.get("content-type"), "bytes", text.length);
    console.log(text.slice(0, 900).replace(/\r/g, ""));
  } catch (error) {
    console.log("\nURL", url, "ERROR", String(error));
  }
}

const coverUrls = [
  "https://art.gametdb.com/wii/cover/EN/RHAP01.png",
  "https://art.gametdb.com/wii/cover/EN/GZLP01.png",
];
for (const url of coverUrls) {
  const response = await fetch(url, { method: "HEAD", headers: { "User-Agent": "MarioRetroCollection/1.0" } });
  console.log("COVER", url, response.status, response.headers.get("content-type"), response.headers.get("content-length"));
}

// probe-version: 2

const moreCoverUrls = [
  "https://art.gametdb.com/ds/cover/EN/A2DP.png",
  "https://art.gametdb.com/3ds/cover/EN/A2AP.png",
  "https://art.gametdb.com/wiiu/cover/EN/ABAP01.png",
  "https://art.gametdb.com/ps3/cover/EN/BLES01792.png",
];
for (const url of moreCoverUrls) {
  const response = await fetch(url, { method: "HEAD", headers: { "User-Agent": "MarioRetroCollection/1.0" } });
  console.log("MORE COVER", url, response.status, response.headers.get("content-type"), response.headers.get("content-length"));
}

const gamePages = [
  "https://www.gametdb.com/DS/A2DP",
  "https://www.gametdb.com/3DS/A2AP",
  "https://www.gametdb.com/WiiU/ABAP01",
  "https://www.gametdb.com/PS3/BLES01792",
];
for (const url of gamePages) {
  const response = await fetch(url, { headers: { "User-Agent": "MarioRetroCollection/1.0" }, redirect: "follow" });
  const html = await response.text();
  const artUrls = [...html.matchAll(/https?:\\?\/\\?\/art\.gametdb\.com[^"'<>\\s]+/gi)].map(m => m[0].replace(/\\\//g, "/"));
  console.log("PAGE ART", url, response.status, [...new Set(artUrls)].slice(0, 20));
}

const matrices = [
  ["ds", "A2DP", ["cover", "coverHQ", "box", "coverM", "coverS", "coverDS"]],
  ["3ds", "A2AP", ["cover", "coverHQ", "box", "coverM", "coverS"]],
  ["wiiu", "ABAP01", ["cover", "coverHQ", "box", "coverM", "cover3D"]],
  ["ps3", "BLES01792", ["cover", "coverHQ", "box", "coverM", "coverfullHQ"]],
];
for (const [system, id, types] of matrices) {
  for (const type of types) {
    for (const ext of ["png", "jpg"]) {
      const url = `https://art.gametdb.com/${system}/${type}/EN/${id}.${ext}`;
      const response = await fetch(url, { method: "HEAD", headers: { "User-Agent": "MarioRetroCollection/1.0" } });
      if (response.status === 200) {
        console.log("FOUND COVER", url, response.headers.get("content-type"), response.headers.get("content-length"));
      }
    }
  }
}
