# 🗺️ AegisRoute - İnteraktif Kişiselleştirilebilir Rota ve Yolculuk Planlayıcı

[English](README.md) | [Türkçe](README_TR.md)

AegisRoute; gezi, seyahat veya etkinlik rotalarınızı interaktif bir harita üzerinde adım adım göstermek, bütçelendirmek ve zamanlamak için tasarlanmış modern, yüksek performanslı tek sayfalık bir web uygulamasıdır. Rota duraklarını, koordinatları ve bütçe verilerini basit bir yapılandırma dosyasından (`route.json`) dinamik olarak okuyarak, herhangi bir şehir veya plan için anında özelleştirilebilir.

---

## 🌟 Öne Çıkan Özellikler

- **İnteraktif Dinamik Harita:** Leaflet.js altyapısı ve Google Maps yol katmanı kullanılmıştır. Rota haritası tüm durakları içine alacak şekilde otomatik odaklanır ve ölçeklenir.
- **Dinamik Zaman Çizelgesi (Timeline) & Görev Listeleri:** Her durak için saatleri, harcamaları, Obsidian tarzı markdown görev listelerini (`- [ ] Yapılacaklar`) ve açıklamaları gösteren kartlar üretir. Kartlara çift tıklayarak durakları düzenleyebilirsiniz.
- **Kişiselleştirilebilir Canlı Geri Sayım:** Tanımlanan bir hedef zamana (örneğin gün batımı, uçuş saati, etkinlik başlangıcı) kalan süreyi saniye saniye hesaplayan canlı geri sayım widget'ı. Rota boş olduğunda otomatik olarak `---` moduna geçer.
- **Konsolide Bütçe Takipçisi:** Tüm duraklardaki maliyetleri otomatik toplayarak toplam bütçe bilgisini günceller.
- **Google Haritalar Yol Tarifi Entegrasyonu:** Her rota kartı, koordinat parametrelerine göre Google Haritalar üzerinde otomatik yürüyüş veya toplu taşıma tarif linkleri oluşturur.
- **Yardım Modalı:** Sol üst menüye entegre edilmiş Yardım butonu sayesinde, doğrudan `docs/KULLANIM.md` dosyasından beslenen kılavuzu arayüz üzerinde şık bir şekilde okuyabilirsiniz.
- **Mobil Uyumlu Responsive Tasarım:** Telefonlarda harita ve liste görünümleri arasında akıcı geçiş sağlayan, yerel harita uygulaması deneyimi sunan mobil arayüz.

---

## 🏗️ Kendi Rotanızı Nasıl Tanımlarsınız?

AegisRoute veri odaklıdır. Rotalarınızı doğrudan web tarayıcısı üzerinden **Rota Editörü & JSON Yükleyici** panelini kullanarak yapılandırabilir ve düzenleyebilirsiniz:
1. Yan menüdeki **"Rotayı Düzenle / JSON Yükle"** butonuna tıklayın.
2. **"Durak Ekle"** sekmesinde; durak adlarını, koordinatları (enlem/boylam), maliyeti, emojileri ve ulaşım tiplerini girerek durağı anında haritaya ekleyin. Yollar otomatik olarak yeniden çizilecektir.
3. **"JSON Yapıştır / Yükle"** sekmesinde; hazır bir JSON rota şemasını yapıştırabilir veya bilgisayarınızdaki bir `.json` dosyasını seçip uygulayabilirsiniz.
4. **"Rotayı İndir (route.json)"** butonuna tıklayarak oluşturduğunuz rotayı bilgisayarınıza indirin.

---

## 🚀 Çalıştırma ve Kurulum

### 1. Docker ile Kurulum (Önerilen)

Projeyi bilgisayarınızda veya sunucunuzda Docker kullanarak tek bir komutla ayağa kaldırabilirsiniz. `docker-compose.yml` dosyası, uygulamanın çalışması için gerekli tüm hacimleri ve çevre değişkenlerini barındırır.

```bash
# Projeyi başlatın (Varsayılan olarak 8888 portunda çalışır)
docker compose up -d
```

Uygulamayı tarayıcınızda açın:
- [http://localhost:8888](http://localhost:8888)

### 2. Yerel Çalıştırma (Python)

1. Gerekli bağımlılıkları yükleyin:
   ```bash
   pip install -r requirements.txt
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
