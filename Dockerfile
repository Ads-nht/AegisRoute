# AegisRoute Sürüm 2.0 Dockerfile
# Hafif, güvenli ve düşük kaynak tüketen Alpine tabanlı imaj
FROM python:3.11-alpine

# Ortam değişkenleri
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    AEGIS_DB_PATH=/app/data/aegis.db \
    AEGIS_UPLOAD_DIR=/app/data/uploads

WORKDIR /app

# Gerekli klasörleri oluştur
RUN mkdir -p /app/data

# Kaynak kodları kopyala
COPY src/ /app/src/

# Sunucu kullanıcısının host kullanıcısıyla (UID/GID 1000) eşleşmesini sağla.
# Bu sayede local bind-mount dosyalarında yazma/okuma izni hatası alınmaz.
RUN addgroup -g 1000 aegisgroup && \
    adduser -u 1000 -G aegisgroup -D aegisuser && \
    chown -R aegisuser:aegisgroup /app

# Kullanıcıyı değiştir
USER aegisuser

# Portu dışarıya aç
EXPOSE 8080

# Uygulamayı başlat
CMD ["python", "src/server.py"]
