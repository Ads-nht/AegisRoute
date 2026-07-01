# 🧠 Nazen Rota - Proje Hafızası (v1.0.0)

## 📌 Genel Bakış
Nazen Rota, İstanbul içerisinde planlanan gezi rotasını hem interaktif haritada gösteren hem de zaman çizelgesi, bütçe hesabı ve gün batımı sayacı ile zenginleştiren modern ve responsive bir web uygulamasıdır. 

Proje, Antigravity Core Protocol (v5.2 Master) kurallarına ve **Poka-Yoke (Hata Önleme)** felsefesine uygun olarak kurgulanmıştır.

---

## 🛠️ Teknik Altyapı ve Kararlar

### 1. Dosya ve Proje Yapısı
Proje Standart Proje Yapısına (Engineering Hierarchy) uygun olarak yapılandırılmıştır:
- `/src/`: Ana kodlar (`server.py`, `index.html`, `style.css`, `app.js`).
- `/docs/`: Teknik arşiv, gelecek hedefleri ve değişiklik geçmişi (`hafiza.md`, `roadmap.md`, `changelog.md`).
- `README.md` ve `requirements.txt`: Kök dizin açıklamaları.

### 2. Harita ve Görsel Kütüphaneler
- **Harita Alt Yapısı:** Ücretsiz, açık kaynaklı ve API anahtarı gerektirmeyen **Leaflet.js** kullanılmıştır.
- **Harita Teması:** Çok sade, göz yormayan ve Türkçe sokak/mahalle isimlerini net gösteren **CartoDB Voyager** harita katmanı seçilmiştir.
- **İkonlar:** Arayüzdeki emoji ve buton grafikleri için FontAwesome kullanılmıştır.

### 3. Poka-Yoke (Hata Önleme) İyileştirmeleri
Kullanıcı deneyiminin gezi esnasında aksamaması için şu önleyici mekanizmalar kurulmuştur:
- **Çevrimdışı/Yükleme Fallback:** İnternet kesilirse veya Leaflet CDN sunucularına ulaşılamazsa sistem çökmez. `app.js` haritanın yüklenemediğini tespit eder, üstte şık bir uyarı banner'ı gösterir, harita bölümlerini kapatır ve zaman çizelgesini (saat, bütçe ve açıklama bilgilerini) tamamen kullanılabilir durumda tutar.
- **Katman Seçim Fail-Safe:** Kullanıcı haritada yürüyüş yollarını kapatmış olsa bile, zaman çizelgesinden yürüyüş rotasındaki bir durağa tıkladığında sistem yürüyüş katmanını otomatik olarak tekrar açar. Böylece kullanıcının tıkladığı nesneyi görememe hatası engellenir.
- **Zaman/Saat Güvenliği:** Canlı gün batımı sayacı, yerel saat bozukluklarına veya negatif zaman farkı durumlarına karşı korumalıdır. Negatif süreler oluştuğunda "NaN" yazmak yerine, gün batımı anının başladığını belirten Türkçe bir mesaj gösterir.
- **Otomatik Port Arama:** Python sunucusu (`server.py`) varsayılan `8080` portu doluysa çökmek yerine, ardışık olarak sonraki portları (`8081`, `8082` vb.) tarar ve bulduğu ilk boş porttan yayına başlar.

---

## ⏳ Mevcut Durum (Current State)
- Rota üzerinde 17 adet gezi noktası tanımlanmış (akşam yemeği Üsküdar'daki Doyuyo! (Yeni Valide Cami Yanı) şubesine çekilmiş, Karaköy'deki Burger King kaldırılmış ve başlangıç buluşması ayrı bir stop olarak eklenmiştir).
- Yemek durağı Doyuyo! Üsküdar (Yeni Valide Cami Yanı) olarak ayarlandığından, toplam bütçe iki kişi için **860 TL** olarak güncellenmiştir.
- Polyline çizim sistemindeki tüm indeksler 17 durağa göre yeniden hizalanmıştır.
- Yürüyüş yolları Üsküdar Çarşı, Karaköy, Galata, Tophane ve Salacak sokaklarını (Hakimiyeti Milliye, Camekan Sk, Serdar-ı Ekrem, Lüleci Hendek, Mumhane vb.) takip edecek şekilde kavisli ve sokak sokak çizgilere dönüştürülmüştür.


---

## 🔮 Sıradaki Adımlar (Next Steps)
1. Kullanıcının talebi doğrultusunda tarayıcı veya mobil arayüz üzerinden görsel kontrollerin yapılması.
2. Tailscale ile bağlanan mobil cihazlardan "Yürüme Tarifi" ve "Toplu Taşıma" butonlarının hedeflenen doğru koordinatlara yönlendirip yönlendirmediğinin testi.

