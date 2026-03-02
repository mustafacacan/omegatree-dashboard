/**
 * Omega Tree API (ngrok URL) üzerinden güncel OpenAPI spec'ini indirir.
 * Çalıştır: npm run openapi:fetch
 * Sonra: npm run openapi:generate
 */
const specUrl = process.env.OPENAPI_SPEC_URL || 'https://unbenignantly-tinkliest-diego.ngrok-free.dev/swagger.json';
const outPath = new URL('../openapi/swagger.json', import.meta.url);

const res = await fetch(specUrl, {
  headers: { 'Ngrok-Skip-Browser-Warning': 'true' },
});
if (!res.ok) {
  console.error('Spec indirilemedi:', res.status, res.statusText);
  process.exit(1);
}
const json = await res.json();
if (json.openapi !== '3.0.0') {
  console.error('Beklenmeyen yanıt (OpenAPI 3.0 JSON değil). Ngrok HTML mi döndü?');
  process.exit(1);
}
await import('fs').then(({ writeFileSync }) =>
  writeFileSync(outPath, JSON.stringify(json, null, 2), 'utf8')
);
console.log('openapi/swagger.json kaydedildi. Şimdi: npm run openapi:generate');
