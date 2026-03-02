/**
 * OpenAPI spec'ini openapi-typescript'ın tüm $ref'leri çözebilmesi için yamalar.
 * - components.responses ekler (backend bunlara referans veriyor ama tanımlamıyor)
 * - Eksik şema isimlerine işaret eden ref'ler için alias ekler
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const specPath = join(__dirname, '..', 'openapi', 'swagger.json');
const spec = JSON.parse(readFileSync(specPath, 'utf8'));

// Hem local hem ngrok sunucusunun listede olması için
const servers = spec.servers || [];
if (!servers.some((s) => s.url && s.url.includes('ngrok'))) {
  servers.push({
    url: 'https://unbenignantly-tinkliest-diego.ngrok-free.dev/api',
    description: 'Ngrok tüneli (gerekirse Ngrok-Skip-Browser-Warning: true header ekle)',
  });
  spec.servers = servers;
}

const { components } = spec;
if (!components) throw new Error('Spec içinde components yok');

// "#/components/responses/X" ref'lerinin çözülmesi için responses ekle
const schemaRef = (name) => ({ $ref: `#/components/schemas/${name}` });
components.responses = {
  UnauthorizedResponse: {
    description: 'Yetkisiz',
    content: { 'application/json': { schema: schemaRef('UnauthorizedResponse') } },
  },
  NotFoundResponse: {
    description: 'Bulunamadı',
    content: { 'application/json': { schema: schemaRef('NotFoundResponse') } },
  },
  ErrorResponse: {
    description: 'Hata',
    content: { 'application/json': { schema: schemaRef('ErrorResponse') } },
  },
  BadRequestResponse: {
    description: 'Hatalı istek',
    content: { 'application/json': { schema: schemaRef('ErrorResponse') } },
  },
};

// Var olmayan şema isimlerine giden ref'ler için alias'lar
if (!components.schemas.CreateClientRequest && components.schemas.CreateClient) {
  components.schemas.CreateClientRequest = { $ref: '#/components/schemas/CreateClient' };
}
if (!components.schemas.DamagedKit && components.schemas.DamageKitResponse) {
  components.schemas.DamagedKit = { $ref: '#/components/schemas/DamageKitResponse' };
}
if (!components.schemas.BadRequestResponse && components.schemas.ErrorResponse) {
  components.schemas.BadRequestResponse = { $ref: '#/components/schemas/ErrorResponse' };
}

writeFileSync(specPath, JSON.stringify(spec, null, 4), 'utf8');
console.log('openapi/swagger.json yamalandı.');
