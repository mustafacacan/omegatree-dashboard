/**
 * Omega Tree API (ngrok URL) üzerinden güncel OpenAPI spec'ini indirir.
 * Çalıştır: npm run openapi:fetch
 * Sonra: npm run openapi:generate
 */
/**
 * Not: Node, .env dosyasını otomatik yüklemez.
 * - Tercih edilen: package.json içinde `node --env-file=.env ...`
 * - Fallback: burada `.env` okunup process.env set edilir.
 */
async function loadDotEnvFallback() {
  try {
    const { readFileSync, existsSync } = await import("fs");
    const { resolve } = await import("path");
    const envPath = resolve(process.cwd(), ".env");
    if (!existsSync(envPath)) return;
    const content = readFileSync(envPath, "utf8");

    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] == null) process.env[key] = value;
    }
  } catch {
    // ignore
  }
}

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function buildCandidateSpecUrls() {
  const candidates = [];

  const envSpec = process.env.OPENAPI_SPEC_URL?.trim();
  if (envSpec) candidates.push(envSpec);

  const viteApi = process.env.VITE_API_URL?.trim();
  if (viteApi) {
    const api = viteApi.replace(/\/+$/, "");
    const root = api.replace(/\/api$/, "");
    // En sık görülen yollar
    candidates.push(`${root}/swagger.json`);
    candidates.push(`${root}/api/swagger.json`);
    candidates.push(`${api}/swagger.json`);
  }

  // Son çare
  candidates.push(
    "https://unbenignantly-tinkliest-diego.ngrok-free.dev/swagger.json",
  );

  return uniq(candidates);
}

await loadDotEnvFallback();

const specUrls = buildCandidateSpecUrls();
const outPath = new URL("../openapi/swagger.json", import.meta.url);

async function fetchJson(url) {
  const isNgrok = url.includes("ngrok");
  const res = await fetch(url, {
    headers: isNgrok ? { "Ngrok-Skip-Browser-Warning": "true" } : undefined,
  });
  return { res };
}

let lastErr = null;
let json = null;

for (const url of specUrls) {
  try {
    const { res } = await fetchJson(url);
    if (!res.ok) {
      lastErr = new Error(
        `Spec indirilemedi: ${res.status} ${res.statusText} (${url})`,
      );
      // 404 gibi durumlarda diğer aday URL'leri dene
      continue;
    }
    const body = await res.json();
    json = body;
    lastErr = null;
    break;
  } catch (e) {
    lastErr = e;
  }
}

if (!json) {
  console.error("Spec indirilemedi. Denenen URLler:");
  for (const u of specUrls) console.error("-", u);
  console.error(
    "Hata:",
    lastErr instanceof Error ? lastErr.message : String(lastErr),
  );
  process.exit(1);
}

if (json.openapi !== "3.0.0") {
  console.error(
    "Beklenmeyen yanıt (OpenAPI 3.0 JSON değil). Ngrok HTML mi döndü?",
  );
  process.exit(1);
}
await import("fs").then(({ writeFileSync }) =>
  writeFileSync(outPath, JSON.stringify(json, null, 2), "utf8"),
);
console.log("openapi/swagger.json kaydedildi. Şimdi: npm run openapi:generate");
