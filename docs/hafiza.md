# AegisRoute — Proje Hafızası

## Genel Bakış

AegisRoute; gezi ve etkinlik rotalarını interaktif harita, zaman çizelgesi, bütçe takibi ve geri sayım ile yöneten tek sayfalık bir web uygulamasıdır.

## Teknik Altyapı

- **Frontend:** HTML, CSS, JavaScript, Leaflet.js, Font Awesome
- **Backend:** Python 3 stdlib (`http.server`), SQLite
- **Harita:** CartoDB Voyager (API anahtarı gerektirmez)
- **Dağıtım:** Docker Compose veya yerel Python

## Poka-Yoke (Hata Önleme)

- Harita CDN yüklenemezse timeline kullanılabilir kalır
- Pasif harita katmanına tıklanınca ilgili katman otomatik açılır
- Geri sayım negatif/NaN değerlerde güvenli fallback gösterir
- Port 8080 doluysa ardışık portlar taranır

## Güvenlik (v1.x)

- Varsayılan dinleme adresi: `127.0.0.1` (yalnızca localhost)
- Docker Compose: `127.0.0.1:8888:8080` (LAN'a açılmaz)
- Paylaşım linkleri salt okunur; yazma için giriş gerekir
- Görsel yükleme kimlik doğrulama gerektirir
- `DISABLE_REGISTRATION=true` ile açık kayıt kapatılabilir

## Ortam Değişkenleri

| Değişken | Varsayılan | Açıklama |
|----------|------------|----------|
| `LISTEN_HOST` | `127.0.0.1` | Dinleme adresi (Docker'da `0.0.0.0`) |
| `AEGIS_PORT` | `8080` | Başlangıç portu |
| `AEGIS_DB_PATH` | `src/aegis.db` | SQLite yolu |
| `AEGIS_UPLOAD_DIR` | `src/uploads` | Yüklenen görseller |
| `DISABLE_REGISTRATION` | — | `true` ise kayıt kapalı |
