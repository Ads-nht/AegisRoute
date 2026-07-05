# AegisRoute — İnteraktif Rota ve Yolculuk Planlayıcı

[English](README.md) | [Türkçe](README.tr.md)

AegisRoute; gezi, seyahat ve etkinlik rotalarını interaktif bir harita üzerinde planlamak, görselleştirmek ve paylaşmak için tasarlanmış tek sayfalık bir web uygulamasıdır. Duraklar, bütçe, ulaşım bacakları ve görev listeleri JSON şeması (`route.json`) ile yönetilir; tarayıcıdan düzenlenebilir veya kullanıcı hesabına SQLite ile kaydedilebilir.

---

## Öne Çıkan Özellikler

- **İnteraktif harita** — Leaflet.js ve CartoDB Voyager katmanı; otomatik odaklanma, katmanlı polyline'lar (yürüyüş, deniz, metro, araç) ve durak işaretleri
- **Zaman çizelgesi ve görev listeleri** — Her durak için saat, maliyet, açıklama ve Obsidian tarzı markdown görevleri (`- [ ]` / `- [x]`)
- **Canlı geri sayım** — Yapılandırılabilir hedef zaman widget'ı (gün batımı, etkinlik başlangıcı vb.)
- **Bütçe takibi** — Durak maliyetlerini otomatik toplar
- **Rota editörü** — Durak ekleme, JSON yapıştır/yükle, `route.json` indirme, yer arama (Google Maps POI + Nominatim yedek)
- **Kullanıcı hesapları** — Kayıt/giriş, çoklu rota kaydetme, paylaşım token'ı ile salt okunur link
- **Dayanıklılık** — Harita yüklenemezse zaman çizelgesi kullanılabilir kalır; 8080 doluysa otomatik port taraması
- **Güvenlik** — PBKDF2 şifreleme, rate limiting, CSRF kontrolü, path traversal koruması, magic-byte görsel doğrulama

---

## Mimari

| Katman | Teknoloji |
|--------|-----------|
| Frontend | HTML, CSS, JavaScript, Leaflet.js, Font Awesome |
| Backend | Python 3 stdlib (`http.server`), SQLite |
| Dağıtım | Docker Compose (önerilen) veya yerel Python |

```
src/
├── server.py      # REST API + statik dosya sunucusu
├── app.js         # Harita, timeline, editör arayüzü
├── index.html
├── style.css
└── route.json     # Varsayılan rota şablonu
```

### API Uç Noktaları

| Metot | Yol | Açıklama |
|-------|-----|----------|
| POST | `/api/register`, `/api/login` | Kullanıcı kimlik doğrulama |
| GET | `/api/my-routes` | Kayıtlı rotalar (Bearer token) |
| POST | `/api/save-route` | Rota oluştur/güncelle |
| GET | `/api/shared-route?token=` | Paylaşılan rotayı yükle |
| GET | `/api/search?q=` | Yer arama |
| POST | `/api/upload` | Görsel yükleme (PNG/JPEG/WebP) |

---

## Kurulum

### Docker (önerilen)

```bash
docker compose up -d
```

Tarayıcıda [http://localhost:8888](http://localhost:8888) adresini açın.

Kalıcı veriler (veritabanı + yüklemeler) `./data/` dizininde tutulur.

### Yerel Python

```bash
pip install -r requirements.txt
python src/server.py
```

Tarayıcıda [http://localhost:8080](http://localhost:8080) (port doluysa otomatik artar).

---

## Yapılandırma

Durakları arayüzden veya doğrudan `src/route.json` dosyasından düzenleyin. Ortam değişkenleri:

| Değişken | Varsayılan | Açıklama |
|----------|------------|----------|
| `AEGIS_DB_PATH` | `src/aegis.db` | SQLite veritabanı yolu |
| `AEGIS_UPLOAD_DIR` | `src/uploads` | Yüklenen görseller dizini |

---

## Lisans

MIT Lisansı
