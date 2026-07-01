# 📜 Değişiklik Günlüğü (Changelog)

Nazen Rota projesinde yapılan tüm güncellemeler bu dökümanda kronolojik olarak listelenmektedir.

## [1.2.0] - 2026-06-19
### Değişti
- Karaköy'deki Burger King/Beşaltı Kirvem Tantuni akşam yemeği planları kaldırıldı.
- Onun yerine gezi başlangıcına, Üsküdar merkezde bulunan öğrenci dostu, doyurucu **Doyuyo! Üsküdar (Yeni Valide Cami Yanı)** şubesi (`[41.02429, 29.01552]`) yemek durağı (13:25 - 14:15) olarak eklendi.
- Başlangıç noktasına "Üsküdar İskelesinde Buluşma" ayrı bir stop olarak eklendi ve rota 17 gezi noktasına çıkarıldı.
- Toplam bütçe 2 kişi için **860 TL** olarak güncellendi.
- Polylines ve indeks yapıları 17 durağa göre tamamen güncellendi, Üsküdar içindeki yürüme yolları eklendi.

## [1.1.0] - 2026-06-19
### Değişti
- Harita üzerinde yolların binalardan geçmesi ve deniz/yürüyüş çizgilerinin karışması sorununu çözmek amacıyla tüm polyline indeksleri 17 elemanlı diziye göre yeniden düzenlendi.
- Kamondo Merdivenleri, Karaköy Meydanı, Mevlevihane, Doğan Apartmanı, Fransız Geçidi ve Balıkçı Mehmet Usta arasındaki tüm yürüyüş rotaları, binaların üstünden uçuş şeklinde değil, sokak ve caddeleri (Camekan Sokak, Serdar-ı Ekrem Caddesi, Lüleci Hendek, Mumhane Caddesi vb.) takip edecek şekilde güncellendi.
- Google Haritalar üzerinde yanlış olan koordinatlar gerçek fiziki konumlarına göre güncellendi.



## [1.0.0] - 2026-06-18
### Eklendi
- Standart proje klasör yapısı (`/src`, `/docs`, `README.md`, `requirements.txt`).
- `server.py`: Çoklu arayüzlere (`0.0.0.0`) açık ve otomatik boş port bulan hafif Python sunucusu.
- `index.html`: Responsive, glassmorphism sidebar içeren gezi planlayıcı şablonu.
- `style.css`: Gece moduna uygun, göz yormayan, gül kurusu rengi vurgulu, mobil toggle destekli tasarım.
- `app.js`: Harita markers, polylines (yürüyüş, deniz, metro), Kız Kulesi gün batımı canlı sayacı, toplam bütçe hesaplayıcı ve interaktif tıklama mantığı.
- **Poka-Yoke Entegrasyonu:** Çevrimdışı/CDN yüklenememe uyarısı, pasif harita katmanlarını tıklamada otomatik açma, saat/gün sayacı negatif değer ve port çakışma korumaları.
