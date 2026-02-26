# OmegaTree Dashboard – Sistem Akışı (Detaylı)

Bu dokümanda uygulamanın **baştan sona** nasıl çalıştığı, kim ne yapar, barkod nerede kullanılır hepsi adım adım anlatılıyor.

---

## 1. Uygulama Ne İşe Yarar?

**OmegaTree**, **Omega-3 Index** (ve benzeri) **test kitlerinin takip sistemi**dir. Yani:

- Fiziksel **kit** üretiliyor, barkodla tanımlanıyor.
- Kit **diyetisyene** gidiyor, oradan **danışana** veriliyor.
- Danışan **numune** alıp laboratuvara gönderiyor.
- **Laboratuvar** numuneyi alıyor, analiz ediyor.
- **Uzman** rapor yazıyor, **admin** onaylıyor.
- Süreç **tamamlandı** olarak kapanıyor.

Tüm bu adımlar dashboard üzerinden **barkod** ile takip ediliyor. Şu an veri **sadece frontend’de** (Zustand store’lar + persist) tutuluyor; gerçek API çağrıları henüz yok.

---

## 2. Roller (Kim Var?)

| Rol        | Türkçe        | Giriş sayfası   | Ne yapar? |
|-----------|----------------|------------------|-----------|
| **ADMIN** | Admin          | `/admin`         | Barkod üretir, fiyat/stok/sipariş yönetir, diyetisyene kit atar, iade onaylar, rapor onaylar, kullanıcı onaylar. |
| **DIETITIAN** | Diyetisyen | `/dietitian`     | Sipariş verir, kit teslim alır, danışana kit atar, “numune gönderildi” der, iade talep edebilir. |
| **LAB**   | Laboratuvar    | `/lab`           | Numune havuzunu görür, numune kabul/red eder, analizi tamamlar, sonuç ekranı. |
| **SPECIALIST** | Uzman   | `/specialist`    | Raporlama havuzundaki kitlere rapor yazar, raporu admin onayına gönderir. |
| **DANISAN** | Danışan      | `/danisan`       | Kendine atanmış kiti görür, barkod girerek “kit teslim aldım” der, raporlarını görür. |

**Kayıt:** Sadece **Diyetisyen**, **Laboratuvar** ve **Raporlama Uzmanı** `/register` ile kendini kaydedebilir. **Danışan** ve **Admin** bu sayfadan kayıt olamaz (admin/danışan hesapları ayrı oluşturulur).

---

## 3. Üye (Kullanıcı) Kaydı ve Onay

1. Kişi **`/register`** sayfasına gider.
2. Ad, soyad, e-posta, telefon, şifre ve **rol** (Diyetisyen / Laboratuvar / Raporlama Uzmanı) girer.
3. **`submitRegistration`** çağrılır → kullanıcı **PENDING** (beklemede) olarak eklenir.
4. Başarılı olursa **`/login`** sayfasına yönlendirilir.
5. Giriş yaptığında durumu **PENDING** ise **`/pending-approval`** sayfasına düşer; “Admin onayı bekliyorsunuz” mesajı görür.
6. **Admin** **`/admin/users`** sayfasından bu kullanıcıyı **onaylar** (veya reddeder / askıya alır).
7. Onaydan sonra kullanıcı tekrar giriş yapınca kendi rol sayfasına (örn. `/dietitian`) gider.

**Özet:** Üye kaydoluyor → Admin onaylıyor → Üye artık sistemi kullanabiliyor.

---

## 4. Barkod Nedir, Nerede Kullanılır?

- Her **kit** tek bir **barkod** ile tanımlanır. Örnek: `OT-2025-00158`.
- Barkod:
  - Kitin **tüm yaşam döngüsünde** (stok → diyetisyen → danışan → lab → uzman → tamamlandı) aynı kalır.
  - **Teslim alma**, **danışana atama**, **numune gönderildi**, **lab kabul/red**, **analiz tamamlandı**, **rapor onay** gibi tüm işlemler barkod üzerinden yapılır.

Yani: **Barkod = Kit’in benzersiz kimliği;** sistemde her şey bu kimlik üzerinden akar.

---

## 5. Kit Gönderme ve Takip Akışı (Baştan Sona)

### Adım 1: Admin – Barkod Üretimi ve Stok

- **Sayfa:** `/admin/production`
- Admin **barkod üretir**: adet, prefix (örn. `OT-2025`) ve işlemi yapan kişi bilgisiyle.
- **`generateBarcodes(quantity, prefix, actor)`** → Yeni kitler **IN_STOCK** (Stokta), konum **“Ana Depo”** olarak oluşur.
- İstenirse barkod bir “kit ürününe” bağlanabilir: **`assignBarcodeToKit(barcode, kitId, kitName, ...)`**.
- Barkodlar **yazdırıldı** diye işaretlenebilir: **`markKitPrinted`** / **`markKitsPrinted`**.

### Adım 2: Admin – Diyetisyene Kit Atama (Sipariş / Zimmet)

- Admin **diyetisyen siparişi** oluşturabilir: **`createDietitianOrder(dietitianId, dietitianName, qty, ...)`** (fiyat paketleri kullanılır).
- **Kiti diyetisyene atar:** **`assignKitsToDietitian(dietitianId, dietitianName, barcodes, trackingNo, ...)`**  
  → Seçilen kitler **ASSIGNED** (Zimmetlendi), konum **“Kargoda”** olur; takip numarası kaydedilir.

Yani: **Kit fiziksel olarak kargoya verilir**, sistemde de “bu barkodlar şu diyetisyene gidiyor” bilgisi atanır.

### Adım 3: Diyetisyen – Kit Teslim Aldım

- Diyetisyen **kendi stok / kit sayfasında** barkodu girer (veya listeyi görür).
- **`receiveKitByBarcode(barcode, dietitianId, dietitianName)`** çağrılır.  
  → Kit **DELIVERED** (Teslim Edildi), konum **“Diyetisyen Stok”** olur.

Böylece **kit diyetisyene ulaştı** bilgisi sisteme girer.

### Adım 4: Diyetisyen – Kit’i Danışana Ata

- Diyetisyen **danışan detay sayfasında** (**`/dietitian/clients/:clientId`**) “Stoktan kit ata” ile kendi stokundaki bir kiti seçer.
- **`assignKitToClient(barcode, dietitianId, clientId, clientName, ...)`** çalışır.  
  → Kit hâlâ **DELIVERED** ama artık **assignedClientId / assignedClientName** dolar; yani “bu kit şu danışana aittir”.

**Önemli:** Danışan portalda giriş yapıp barkodla “teslim aldım” diyebilmesi için, kit atanırken kullanılan **clientId** ile danışan **kullanıcı id’si** aynı olmalıdır. Yani danışan kullanıcısı (Admin tarafından veya entegrasyonla) oluşturulurken, ilgili **Client** kaydı ile aynı id kullanılır / eşleştirilir.

### Adım 5: Danışan – Kit Teslim Aldım (Barkod Girişi)

- Danışan **`/danisan/kit`** sayfasına gider.
- **Barkodu** girer ve gönderir.
- **`receiveKitByClient(barcode, clientId, clientName)`** çağrılır; `clientId` = giriş yapan danışanın `user.id`’si.
- Kontroller:
  - Barkod var mı?
  - Bu barkod **bana atanmış mı?** (`assignedClientId === user.id`)
  - Daha önce teslim alınmamış mı?
- Başarılıysa kit **CLIENT_RECEIVED** (Danışan teslim aldı), konum **“Danışan”** olur.

Yani: **Danışan fiziksel kiti alıyor**, portalda barkod girerek “ben aldım” diyor.

### Adım 6: Numune Gönderildi (Diyetisyen veya Danışan)

- **Fiziksel süreç:** Numuneyi laboratuvara danışan gönderir. Belgelere göre bu adımın tek sorumlusu net tanımlı değildir; uygulama hem diyetisyen hem danışanın bu aksiyonu tetiklemesine izin verir.
- **Diyetisyen:** **Kits** sayfasında ilgili kit için **“Numune gönderildi”** işaretleyebilir → **`markSampleSent(barcode, dietitianId, actor)`**.
- **Danışan:** **`/danisan/kit`** sayfasında kit **CLIENT_RECEIVED** iken **“Numuneyi laboratuvara gönderdim”** butonu ile aynı aksiyonu tetikleyebilir → **`markSampleSentByClient(barcode, clientId, clientName, actor)`**.
- Sonuç: Kit **SAMPLE_SENT** (Numune Gönderildi), konum **“Laboratuvar Havuzu”** olur.

Böylece **numune lab’a gitti** bilgisi sisteme girer. İleride yetki sadece danışana da bırakılabilir; şu an her iki rol de işaretleyebilir.

### Adım 7: Laboratuvar – Havuzdan Numune Kabul / Red

- **Sayfa:** `/lab/pool` (Numune Havuzu)
- Listelenen kitler: **SAMPLE_SENT** veya **LAB_PENDING** durumundakiler.
- Lab yetkilisi:
  - **Kabul:** **`labAcceptSample(barcode, actor)`** → Kit **IN_ANALYSIS** (Analizde), konum **“Laboratuvar Analiz”**.
  - **Red:** **`labRejectSample(barcode, reason, actor)`** → Kit **REJECTED** (Reddedildi).

### Adım 8: Laboratuvar – Analiz Tamamlandı

- **Sayfa:** `/lab/analysis`
- Analiz bittiğinde **“Analizi tamamla”** benzeri aksiyon ile **`labCompleteAnalysis(barcode, actor)`** çağrılır.  
  → Kit **ANALYSIS_COMPLETE** (Analiz Tamamlandı), konum **“Uzman Havuzu”**, rapor durumu **SPECIALIST_POOL** olur.

### Adım 9: Uzman – Rapor Yazma ve Gönderme

- **Sayfa:** `/specialist` (atamalar / rapor editörü)
- Uzman ilgili barkod için raporu yazar ve **gönderir**.
- **`specialistSubmitReport(barcode, actor)`** → Rapor durumu **ADMIN_APPROVAL** (Admin Onayında); kit **ADMIN_APPROVAL** vb. akışa girer.

### Adım 10: Admin – Rapor Onayı

- Admin raporu onaylar.
- **`adminApproveReport(barcode, actor)`** → Rapor **APPROVED**, kit **COMPLETED** (Tamamlandı) olur.

Bu noktada **tüm süreç** o barkod için tamamlanmış olur.

---

## 6. Kit Durumları (Kısa Özet)

| Durum              | Türkçe            | Anlamı |
|--------------------|-------------------|--------|
| IN_STOCK           | Stokta            | Depoda, kimseye atanmamış. |
| ASSIGNED           | Zimmetlendi       | Diyetisyene atandı, kargoda. |
| DELIVERED          | Teslim Edildi     | Diyetisyen teslim aldı. |
| CLIENT_RECEIVED    | (Danışan aldı)    | Danışan barkodla teslim aldı. |
| SAMPLE_SENT        | Numune Gönderildi | Numune lab’a gönderildi. |
| LAB_PENDING        | Lab Bekliyor      | Lab’da havuzda. |
| REJECTED           | Reddedildi        | Lab numuneyi reddetti. |
| IN_ANALYSIS        | Analizde          | Lab analiz ediyor. |
| ANALYSIS_COMPLETE  | Analiz Tamamlandı | Analiz bitti, uzman havuzunda. |
| SPECIALIST_POOL    | Uzman Havuzunda   | Uzman rapor yazacak. |
| REPORT_READY       | Rapor Hazır       | Rapor yazıldı. |
| ADMIN_APPROVAL     | Admin Onayında    | Admin raporu onaylayacak. |
| COMPLETED          | Tamamlandı        | Süreç bitti. |
| RETURN_REQUESTED   | İade Talebi       | Diyetisyen iade istedi. |
| DAMAGED            | Hasarlı           | Hasarlı bildirildi. |

---

## 7. İade Akışı

1. **Diyetisyen** (Kits sayfasında) bir kit için **iade talebi** oluşturur: **`requestKitReturn(barcode, dietitianId, reason, actor, { photoUrl })`**  
   → Kit **RETURN_REQUESTED** olur.
2. **Admin** **`/admin/returns`** sayfasından talebi görür.
3. **Onay:** **`adminApproveReturn(barcode, actor)`** veya **Red:** **`adminRejectReturn(barcode, actor)`**.

---

## 8. Veri Nerede, API Var mı?

- **Şu an:** Hiçbir yerde `api.get/post/...` çağrısı yok. Tüm veri **Zustand** store’larda:
  - **auth.store:** Giriş yapan kullanıcı, token (ileride API için).
  - **users.store:** Kullanıcı listesi, kayıt, giriş, onay (authenticate, submitRegistration, approveUser, vb.).
  - **workflow.store:** Kitler, siparişler, fiyat paketleri, tüm kit aksiyonları (barkod üret, ata, teslim al, lab kabul/red, analiz tamamla, rapor gönder, admin onay, iade). Persist ile tarayıcıda kalıcı.
  - **clients.store:** Diyetisyenin danışan (müşteri) listesi.
- **Axios** `src/lib/axios.ts` içinde `VITE_API_URL` ve Bearer token ile hazır; gerçek backend bağlandığında store aksiyonları bu API çağrılarıyla değiştirilebilir.

---

## 9. Tek Cümlede Akış

**Üye (Diyetisyen/Lab/Uzman) kaydoluyor → Admin onaylıyor → Admin barkod üretip kiti diyetisyene atıyor (kargoya veriyor) → Diyetisyen barkodla teslim alıyor → Diyetisyen kiti danışana atıyor → Danışan barkodla “kit teslim aldım” diyor → Diyetisyen “numune gönderildi” işaretliyor → Lab havuzda numuneyi kabul/red ediyor → Lab analizi tamamlıyor → Uzman rapor yazıp gönderiyor → Admin raporu onaylıyor → Süreç tamamlanıyor.**

Bu akışta **her adımda barkod** kitin kimliği olarak kullanılıyor; kim nereye atıyor, kim teslim alıyor, lab/uzman/admin ne yapıyor hepsi bu barkod üzerinden takip ediliyor.

---

## 10. Ek Notlar

### Rapor: Admin onayı var mı? (Döküman çelişkisi)
- **Bir döküman:** Uzman raporu yükleyince doğrudan danışan ve diyetisyene bildirim gider.
- **Diğer döküman:** Raporun yayına girmesi için admin onayı şart.
- **Uygulama:** Şu an **admin onayı** akışta: Uzman raporu gönderir → **ADMIN_APPROVAL** → Admin onaylar → **APPROVED** / **COMPLETED**. İleride “admin onayı yok” senaryosu istenirse, uzman gönderince doğrudan **APPROVED** yapılıp danışan/diyetisyene bildirim tetiklenebilir; bu iş kuralı netleştirilmeli.

### Denetim izi (Audit log)
- **workflow.store** içinde **auditLogs** tutuluyor: her aksiyonda kim, ne zaman, hangi IP, hangi işlem (entity, action, details) kaydediliyor.
- **Admin paneli:** **`/admin/audit`** sayfasında bu loglar listelenir (tarih, kullanıcı, işlem, varlık, detay, IP). Filtre ve dışa aktarma alanları eklenebilir.
