# 📖 AegisRoute Kullanım Kılavuzu

AegisRoute, tamamen çevrimdışı çalışan, gizliliğe odaklı kişisel rota ve gezi planlama aracıdır. Kendi sunucunda çalışır, verilerini kimseyle paylaşmaz.

---

## 🚀 Başlarken: İlk Durak Nasıl Eklenir?

### Yöntem 1 — Arama Barı ile Yer Bulma (En Kolay)

1. Haritanın üst kısmındaki **🔍 arama kutusuna** tıkla.
2. Aramak istediğin yeri yaz (örn: `Maltepe metro`, `Kadıköy iskele`, `Tusdata Maltepe`).
3. Açılan listeden yere tıkla → harita o noktaya gider, kırmızı bir iğne işaretlenir.
4. Sol panelde **"+ Durak Ekle"** formunu doldur:
   - **Başlık** ve **Açıklama** yaz
   - **Saat** seç (saat seçiciyi kullan)
   - **Emoji** ve **Ulaşım tipini** seç
   - **Kaydet**'e bas

### Yöntem 2 — Haritaya Tıklayarak Konum Seçme

1. Durak ekleme formunu aç (**"Yeni Durak Ekle"** butonuna bas).
2. **"Haritadan Konum Seç"** butonuna bas — form kapanır, harita aktif olur.
3. Haritada istediğin noktaya tıkla → koordinatlar otomatik dolar.
4. Kalan bilgileri doldur ve kaydet.

### Yöntem 3 — JSON ile İçe Aktarma

Daha önce dışa aktardığın bir rotayı geri yüklemek için:

1. Sol panelde **"Rotayı Düzenle / JSON Yükle"** butonuna bas.
2. Açılan editöre `route.json` içeriğini yapıştır.
3. **"Rotayı Yükle"** butonuna bas.

---

## 🗺️ Durak Detayları — Ne Anlama Gelir?

| Alan | Açıklama |
|---|---|
| **Başlık** | Durağın adı (örn: "Üsküdar İskelesi") |
| **Açıklama** | Kısa bir not (ne yapılacak, neden önemli) |
| **Saat** | Başlangıç ve bitiş saati |
| **Bütçe** | Bu durağa harcanan tahmini para |
| **Emoji** | Durağı temsil eden simge |
| **Ulaşım Tipi** | Bu durağa nasıl gidildiği (Yürüyüş, Metro, Deniz, Araba) |
| **Notlar / Görevler** | Markdown ile görev listesi, notlar, linkler |

---

## ✅ Görev Listesi Ekleme (Notlar Alanı)

Notlar kutusuna Markdown yazabilirsin. Aşağıdaki formatları destekler:

```markdown
- [ ] Bilet al
- [ ] Güneş kremi koy
- [x] Harita indir (tamamlandı)

**Önemli:** Akşam 18:30'da kapanıyor!

> Müze girişi: 50 TL
```

Mobilde hızlıca görev eklemek için **"Görev Ekle"** kısa yolunu kullan:
1. Küçük giriş kutusuna görev adını yaz (örn: `Bilet satın al`)
2. **"+"** butonuna bas → otomatik olarak `- [ ] Bilet satın al` formatında eklenir.

---

## 📱 Mobil Kullanım

- **Zaman Çizelgesi ↔ Harita**: Alt çubuktan sekmeler arasında geç veya sağa/sola kaydır.
- **Durak Düzenleme**: Bir karta **çift dokunmak** düzenleme ekranını açar.
- **Durak Silme**: Karta dokunup açılan alt menüden **"Durağı Sil"** seç.
- **Sıra Değiştirme**: Masaüstünde kartları sürükle-bırak yaparak yeniden sırala.

---

## 💾 Rotayı Kaydetme ve Paylaşma

### Yerel Kaydetme
- **Rotayı Dışa Aktar** butonuna basarak `route.json` dosyasını indir.
- Bu dosyayı tekrar yükleyerek kaldığın yerden devam edebilirsin.

### Bulut Kaydetme (Hesap Gerekmeli)
- **Giriş Yap** ile hesap oluştur.
- **Kaydet** butonuyla rotanı sunucuya kaydet.
- **Rotalarım** bölümünden kayıtlı rotalarını görüntüle.

---

## 🔧 Kendi Sunucuna Kurulum (Docker)

```bash
# 1. Projeyi klonla
git clone https://github.com/kullaniciadi/AegisRoute.git
cd AegisRoute

# 2. Docker ile başlat
docker compose up -d

# 3. Tarayıcıda aç
# http://localhost:8080
```

**Gereksinimler:** Docker ve Docker Compose yeterlidir. Python, pip veya başka bağımlılık gerekmez.

---

## ❓ Sık Sorulan Sorular

**Arama neden doğru yeri bulamıyor?**
> Uygulama Google Maps altyapısını ve Nominatim (OpenStreetMap) veritabanını kullanır. Küçük yerel işletmeleri bulmak için işletme adını tam yaz (örn: "Tusdata Maltepe" gibi).

**Rota verilerim güvende mi?**
> Evet. Tüm veriler kendi sunucunda veya cihazında saklanır. Üçüncü taraf bir servise gönderilmez.

**Harita neden yüklenmedi?**
> İnternet bağlantısı olmadan harita katmanları yüklenmez, ancak rota verileriniz ve zaman çizelgeniz çevrimdışında da çalışmaya devam eder.

**Durakların sırası nasıl değiştirilir?**
> Masaüstünde sürükle-bırak yöntemiyle kartları yeniden sıralayabilirsin.
