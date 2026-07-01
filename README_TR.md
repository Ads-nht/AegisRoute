# 🗺️ AegisRoute - İnteraktif Kişiselleştirilebilir Rota ve Yolculuk Planlayıcı

[English](README.md) | [Türkçe](README_TR.md)

AegisRoute; gezi, seyahat veya etkinlik rotalarınızı interaktif bir harita üzerinde adım adım göstermek, bütçelendirmek ve zamanlamak için tasarlanmış modern, yüksek performanslı tek sayfalık bir web uygulamasıdır. Rota duraklarını, koordinatları ve bütçe verilerini basit bir yapılandırma dosyasından (`route.json`) dinamik olarak okuyarak, herhangi bir şehir veya plan için anında özelleştirilebilir.

---

## 🌟 Öne Çıkan Özellikler

- **İnteraktif Dinamik Harita:** Leaflet.js altyapısı ve sade CartoDB Voyager harita katmanı kullanılmıştır. Rota haritası tüm durakları içine alacak şekilde otomatik odaklanır ve ölçeklenir.
- **Dinamik Zaman Çizelgesi (Timeline):** Her durak için saatleri, emojileri, harcamaları ve açıklamaları gösteren kartlar üretir. Kartlara tıklamak haritayı o noktaya odaklar ve detay balonunu açar.
- **Kişiselleştirilebilir Canlı Geri Sayım:** Tanımlanan bir hedef zamana (örneğin gün batımı, uçuş saati, etkinlik başlangıcı) kalan süreyi saniye saniye hesaplayan canlı geri sayım widget'ı.
- **Konsolide Bütçe Takipçisi:** Tüm duraklardaki maliyetleri otomatik toplayarak toplam bütçe bilgisini günceller.
- **Google Haritalar Yol Tarifi Entegrasyonu:** Her rota kartı, koordinat parametrelerine göre Google Haritalar üzerinde otomatik yürüyüş veya toplu taşıma tarif linkleri oluşturur.
- **Mobil Uyumlu Responsive Tasarım:** Telefonlarda harita ve liste görünümleri arasında akıcı geçiş sağlayan, yerel harita uygulaması deneyimi sunan mobil arayüz.

---

## 🏗️ Kendi Rotanızı Nasıl Tanımlarsınız?

AegisRoute veri odaklıdır. `src/` dizini altındaki [route.json](src/route.json) dosyasını düzenlemeniz yeterlidir.

### Yapılandırma Şeması (`route.json`):
```json
{
  "config": {
    "title": "AegisRoute",
    "subtitle": "Interactive Custom Route Planner",
    "map_center": [41.0240, 28.9950],
    "map_zoom": 13,
    "countdown_label": "Hedef Zaman Başlığı",
    "countdown_target": "20:38",
    "countdown_hour": 20,
    "countdown_minute": 38,
    "footer_text": "AegisRoute ile harika rotalar planlayın. ❤️"
  },
  "itinerary": [
    {
      "id": 1,
      "time": "13:15 - 13:25",
      "title": "Durak Başlığı",
      "locationName": "Mekan Adı",
      "desc": "Durakta yapılacak aktivitelerin açıklaması.",
      "cost": 50,
      "costLabel": "~50 TL",
      "emoji": "📍",
      "type": "walk",
      "coords": [41.02758, 29.01518],
      "type_to_next": "walk",
      "path_to_next": [
        [41.02500, 29.01600]
      ]
    }
  ]
}
```

- **`coords`**: Durağın harita üzerindeki enlem ve boylam koordinatları.
- **`path_to_next`**: İsteğe bağlı olarak, mevcut duraktan bir sonrakine giden yol çizgisinin (yolları, deniz hatlarını veya metroları takip edecek şekilde) kıvrımlarını belirleyen ara koordinat dizisi.
- **`type_to_next`**: `walk` (yürüyüş), `sea` (deniz yolu), `metro` (metro), `drive` (araç) veya `none`. Bir sonraki durağa çizilecek çizginin rengini ve stilini belirler.

---

## 🚀 Çalıştırma ve Kurulum

### Yerel Çalıştırma
1. Terminalden proje dizinine gidin:
   ```bash
   cd AegisRoute
   ```
2. Python yerel sunucusunu başlatın:
   ```bash
   python src/server.py
   ```
3. Tarayıcınızdan şu adrese gidin:
   - [http://localhost:8080](http://localhost:8080)

---

## 📄 Lisans

Bu proje MIT Lisansı ile lisanslanmıştır.
