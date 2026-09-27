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
