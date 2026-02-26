# OmegaTree Dashboard — Eksikler ve İyileştirme Analizi

Bu dokümanda proje tarandı; eksikler, tutarsızlıklar ve "yakında" bırakılan özellikler listelenmiştir.

---

## 1. Düzeltilen (Bu Oturumda)

- **Danışan Kit sayfası:** `sonner` → `react-hot-toast` (sayfa açılmıyordu).
- **Kit durumu etiketleri:** `CLIENT_RECEIVED` eksikti; `KIT_STATUS_LABELS`, `KIT_STATUS_COLORS` ve `StatusBadge` içinde eklendi.

---

## 2. Veri / Mantık Eksikleri

### 2.1 Danışan–Client ID eşleşmesi
- **Durum:** Diyetisyen "danışan"ı clients store’a ekliyor → `addClient` **rastgele ID** üretiyor (örn. `20250601003`). Kit danışana atanınca `assignedClientId` bu ID oluyor.
- **Sorun:** Danışan portalda giriş yapınca `user.id` (örn. `u-danisan-1`) kullanılıyor. Raporlar/kit sayfası `assignedClientId === user?.id` ile filtreliyor. Yani **clients store’daki danışan ID’si ile giriş yapan kullanıcı ID’si aynı olmalı**.
- **Eksik:** Admin danışan kullanıcısı oluştururken veya diyetisyen “danışan ekle” yaparken, portalda giriş yapacak danışan için **client id = user id** (veya client’ta `userId` alanı) ilişkisi yok. Demo için seed’de 00149/00150’ye `u-danisan-1` verdik; yeni eklenen danışanlar için bu bağ kurulmuyor.
- **Öneri:** Danışan kullanıcısı oluşturulurken aynı id ile client kaydı açılması veya client’a `userId` alanı eklenip kit atama/görüntülemede bu alanın kullanılması.

### 2.2 Rapor PDF / paylaşım
- **Rapor görüntüleme (ReportViewModal):** Hep `pdfUrl={undefined}` geçiliyor → PdfViewer demo PDF açıyor. Gerçek rapor PDF’i backend’den gelmediği sürece hep demo görünecek.
- **Paylaşım sayfası (/share/:reportId):** Token geçerli olsa bile `file={undefined}` → yine demo PDF. Gerçek rapor ID/token ile PDF URL’i üretilmiyor.
- **Öneri:** Backend’de rapor PDF’i saklanıp URL dönünce, diyetisyen/danışan görüntüleme ve paylaşım linkinde bu URL kullanılmalı.

### 2.3 Rapor içeriği saklanmıyor
- Uzman rapor editöründe yazılan “Genel Değerlendirme”, “Beslenme Önerileri”, “Takviye Önerileri” ve yüklenen PDF **workflow (veya ayrı report) store’da tutulmuyor**. Sadece `specialistSubmitReport(barcode)` ile durum **ADMIN_APPROVAL**’a geçiyor.
- **Öneri:** Rapor metni ve PDF URL’i bir report store veya workflow’daki kit’e bağlı report alanında saklanmalı; onay sonrası danışan/diyetisyen bu içeriği görebilmeli.

---

## 3. “Yakında” / Placeholder Özellikler

| Sayfa / Bileşen | Ne yazıyor | Durum |
|-----------------|------------|--------|
| Ayarlar | "Tema tercihi (yakinda)" | Tema değiştirme yok |
| Şablonlar (admin) | "Şablon yükleme / Önizleme / Düzenleme yakında" | Toast ile bilgi |
| Denetim izi | "Dışa aktarma yakında" | Export yok |
| Danışan raporlar | "PDF indir (isteğe bağlı)" | İndirme yok |
| Danışan detay – Raporlar | "Rapor indirme / Yazdırma yakında" | Toast |
| Rapor paylaşımı | Share sayfasında gerçek PDF yok | Demo PDF |

Bunlar kullanıcıya “yakında” diye sunulmuş; backend/PDF hazır olunca bağlanabilir.

---

## 4. Eksik veya Kısmen Eksik Sayfalar

- **Specialist dashboard (/specialist):** Var ama içerik sade; atamalar için kullanıcı doğrudan **Atanan İşler**’e gidiyor. İstersen dashboard’da “Bekleyen rapor sayısı” ve kısa liste eklenebilir.
- **Share report:** Route `/share/:reportId` var; layout yok (auth yok, sadece PDF alanı). Token kontrolü var, PDF ise hâlâ demo.
- **404:** Basit metin + “Ana Sayfaya Dön” linki; tasarım diğer sayfalarla uyumlu değil.

---

## 5. Tutarlılık / UX

- **Boş durumlar:** Birçok listede “Henüz … yok” metni var; bazı sayfalarda ikon + kısa açıklama, bazılarında sadece metin. İstersen tüm boş durumlarda aynı şablon (ikon + başlık + açıklama) kullanılabilir.
- **Tasarım:** Admin/diyetisyen tarafında sıcak palet (W.olive, W.cream vb.) kullanılıyor; lab, specialist ve danışan sayfalarında hem bu palet hem surface/primary karışık. İstersen tüm rollerde tek palet veya rol bazlı tutarlı tema uygulanabilir.
- **Header başlık:** `/admin/reports` için “Rapor Onayları” eklendi; diğer admin sayfaları da kontrol edildi.

---

## 6. Teknik / Altyapı

- **API:** Tüm veri Zustand + persist; gerçek API yok. `src/lib/axios.ts` ve `VITE_API_URL` hazır; backend gelince store aksiyonları API çağrılarıyla değiştirilebilir.
- **Yetkiler:** `permissions.ts` var; UI’da buton/sayfa gizleme bu yetkilere tam bağlı değil (çoğunlukla rol bazlı). İleride sayfa/aksiyon bazlı yetki kontrolü eklenebilir.
- **Audit:** workflow store’da audit log yazılıyor; admin denetim sayfasında listeleniyor. Filtre/dışa aktarma “yakında” olarak bırakılmış.

---

## 7. Özet Öncelik Listesi

1. **Yüksek:** Danışan–client ID eşleşmesi (yeni danışanların portalda kendi kitini/raporunu görmesi).
2. **Orta:** Rapor içeriği (metin + PDF URL) saklama ve görüntüleme/paylaşımda kullanma.
3. **Orta:** Paylaşım linkinde gerçek rapor PDF’i (backend hazır olunca).
4. **Düşük:** “Yakında” özellikler (tema, şablon düzenleme, dışa aktarma, PDF indir/yazdır).
5. **Düşük:** Boş durum ve tasarım tutarlılığı, 404 sayfası iyileştirmesi.

İstersen sırayla 1 ve 2’yi (danışan–client eşleşmesi + rapor içeriği) detaylı tasarlayıp adım adım uygulayabiliriz.
