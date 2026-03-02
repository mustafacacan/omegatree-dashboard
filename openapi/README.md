# Omega Tree OpenAPI

Bu klasör [Omega Tree API](https://unbenignantly-tinkliest-diego.ngrok-free.dev/swagger.json) OpenAPI 3.0 spec'ini tutar.

---

## Nasıl çalışıyor? (Öğrenme rehberi)

### 1. OpenAPI / Swagger nedir?

Backend’in “hangi URL’lere istek atılır, body’de ne gider, cevapta ne döner?” bilgisini **tek bir JSON dosyasında** (spec) tanımlar. Bu dosyaya **OpenAPI spec** veya **swagger.json** denir.

- **Faydası:** Hem dokümantasyon hem de bu spec’ten **otomatik TypeScript tipleri** üretebilirsin. Yazarken yanlış alan göndermeyi / kullanmayı azaltır.

### 2. Bu projede akış (büyük resim)

```
[Backend API]                    [Bu proje]
     |                                |
     |  swagger.json (spec)            |
     |  (ngrok URL'den veya            |
     |   openapi/swagger.json)         |
     |         |                      |
     |         v                      v
     |   scripts/fetch-openapi.mjs   (1) Spec'i indir
     |         |                      |
     |         v                      v
     |   openapi/swagger.json        (2) Spec dosyası burada
     |         |                      |
     |         v                      v
     |   scripts/patch-openapi.mjs   (3) Eksik referansları düzelt
     |         |                      |
     |         v                      v
     |   openapi-typescript (npm)    (4) Spec'ten TypeScript üret
     |         |                      |
     |         v                      v
     |   src/types/openapi.d.ts      (5) Tipler burada; import edip kullan
```

Yani: **Spec indir → Düzelt (patch) → Spec’ten tip üret → Kodda tipleri kullan.**

### 3. Dosyaların rolleri

| Dosya | Ne işe yarıyor? |
|--------|------------------|
| **openapi/swagger.json** | API’nin “sözleşmesi”: endpoint’ler, parametreler, body/response şemaları. Backend’in verdiği spec. |
| **scripts/fetch-openapi.mjs** | Bu spec’i backend’in (ngrok) adresinden indirip `openapi/swagger.json` olarak kaydeder. Spec güncellendiğinde tekrar çalıştırırsın. |
| **scripts/patch-openapi.mjs** | Backend spec’inde bazen referanslar eksik oluyor (`$ref`). Bu script eksik `responses` ve şema alias’larını ekleyerek tip üretecinin (openapi-typescript) hata vermesini engeller. |
| **src/types/openapi.d.ts** | `openapi-typescript`’in swagger.json’dan **otomatik ürettiği** TypeScript tipleri. Bunu sen yazmıyorsun; `npm run openapi:generate` yazıyor. |
| **package.json** içindeki script’ler | `openapi:fetch` = spec indir, `openapi:generate` = patch + tip üret. |

### 4. Patch neden gerekli?

Backend’de bazı endpoint’ler şöyle diyor: “401 dönerse `#/components/responses/UnauthorizedResponse` kullan.” Ama spec’te **components.responses** bölümü yok; sadece **components.schemas** var. openapi-typescript bu referansı çözemiyor ve hata veriyor.

**Patch script’i:**  
Eksik olan `components.responses` (UnauthorizedResponse, NotFoundResponse, ErrorResponse, BadRequestResponse) ve bazı şema alias’larını (CreateClientRequest, DamagedKit, BadRequestResponse) spec’e ekliyor. Böylece tüm `$ref`’ler çözülüyor ve tip üretimi tamamlanıyor.

### 5. Tipleri kodda nasıl kullanırsın?

`openapi.d.ts` içinde iki önemli şey var:

- **paths:** Her endpoint (path + method) için istek/cevap tipleri.
- **components["schemas"]:** Tüm ortak modeller (User, ClientResponse, OrderResponse vb.).

Örnek:

```ts
import type { components, paths } from '@/types/openapi'

// Backend'deki bir modelin tipi
type Kullanici = components['schemas']['UserResponse']

// GET /clients cevabının tipi
type ClientsCevabi = paths['/clients']['get']['responses']['200']['content']['application/json']

// POST /auth/login body tipi
type LoginBody = paths['/auth/login']['post']['requestBody']['content']['application/json']
```

Servis fonksiyonlarında ve React Query (`useQuery` / `useMutation`) hook’larında bu tipleri kullanırsan, API ile sözleşme (spec) senkron kalır.

### 6. Özet

1. **swagger.json** = API’nin yazılı sözleşmesi (spec).  
2. **fetch** = Spec’i backend’den indirip projeye alıyoruz.  
3. **patch** = Spec’teki eksik referansları düzeltiyoruz.  
4. **openapi:generate** = Bu spec’ten `openapi.d.ts` tip dosyasını üretiyoruz.  
5. **Kodda** = `paths` ve `components['schemas']` tiplerini import edip kullanıyoruz.

Böylece API değiştiğinde spec’i güncelleyip `openapi:generate` çalıştırman yeterli; tipler otomatik güncellenir.

---

## Komutlar

| Komut | Açıklama |
|--------|----------|
| `npm run openapi:fetch` | Spec'i ngrok URL'den indirir (`openapi/swagger.json`). |
| `npm run openapi:generate` | Spec'i yamalayıp `src/types/openapi.d.ts` TypeScript tiplerini üretir. |

## Kullanım

- **API base URL:** `.env` veya `.env.local` içinde `VITE_API_URL` kullanılıyor (örn. `http://localhost:3005/api` veya ngrok URL + `/api`).
- **Tipler:** Servislerde ve React Query hook'larında `import type { paths, components } from '@/types/openapi'` ile kullan.

## Spec güncelleme

1. `npm run openapi:fetch` (isteğe bağlı; spec zaten projede varsa atlayabilirsin).
2. `npm run openapi:generate` (patch + tip üretimi).
