#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys
import json
import urllib.request
import sqlite3
import uuid
import datetime
import hashlib
import re
import time
from concurrent.futures import ThreadPoolExecutor

# Rate Limiter memory storage
RATE_LIMITS = {}  # ip -> [timestamps]
AUTH_LIMITS = {}  # ip -> [timestamps]

def check_rate_limit(ip, is_auth=False):
    now = time.time()
    limit_dict = AUTH_LIMITS if is_auth else RATE_LIMITS
    max_req = 5 if is_auth else 60
    window = 60 # 1 minute
    
    if ip not in limit_dict:
        limit_dict[ip] = []
        
    # Filter only events in current window
    limit_dict[ip] = [t for t in limit_dict[ip] if now - t < window]
    
    # Prune memory if too many entries stored
    if len(limit_dict) > 1000:
        expired_ips = [k for k, v in limit_dict.items() if not v or now - v[-1] > window]
        for k in expired_ips:
            del limit_dict[k]
            
    if len(limit_dict[ip]) >= max_req:
        return False
        
    limit_dict[ip].append(now)
    return True

# Concurrency ThreadPool TCPServer to limit RAM usage (max 5 threads)
class ThreadPoolTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    executor = ThreadPoolExecutor(max_workers=5)
    
    def process_request(self, request, client_address):
        self.executor.submit(self.process_request_thread, request, client_address)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PORT = 8080
DB_PATH = os.getenv('AEGIS_DB_PATH', os.path.join(SCRIPT_DIR, 'aegis.db'))
UPLOAD_DIR = os.getenv('AEGIS_UPLOAD_DIR', os.path.join(SCRIPT_DIR, 'uploads'))

# Ensure parent directories exist
db_parent = os.path.dirname(DB_PATH)
if db_parent and not os.path.exists(db_parent):
    os.makedirs(db_parent)
    
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  username TEXT UNIQUE NOT NULL,
                  password_hash TEXT NOT NULL,
                  salt TEXT NOT NULL,
                  token TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS routes
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER NOT NULL,
                  name TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  route_data TEXT NOT NULL,
                  share_token TEXT,
                  FOREIGN KEY(user_id) REFERENCES users(id))''')
    try:
        c.execute('ALTER TABLE routes ADD COLUMN share_token TEXT')
    except sqlite3.OperationalError:
        pass # Column already exists
    conn.commit()
    conn.close()

    # Secure the DB file permissions
    try:
        os.chmod(DB_PATH, 0o600)
    except Exception as e:
        print(f"Warning: Could not set permissions on {DB_PATH}: {e}")

init_db()

def hash_password_with_salt(password, salt_hex=None):
    if not salt_hex:
        salt = os.urandom(16)
        salt_hex = salt.hex()
    else:
        salt = bytes.fromhex(salt_hex)
    
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return key.hex(), salt_hex

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def _send_cors_headers(self):
        origin = self.headers.get('Origin')
        host = self.headers.get('Host')
        if origin and host:
            if host in origin:
                self.send_header('Access-Control-Allow-Origin', origin)
                self.send_header('Access-Control-Allow-Headers', 'Authorization, Content-Type')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')

    def end_headers(self):
        self._send_cors_headers()
        # Security Headers
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('X-XSS-Protection', '1; mode=block')
        super().end_headers()
        
    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def send_error_response(self, code, message):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode('utf-8'))

    def send_success_response(self, data):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def _read_json_payload(self, max_length):
        content_length_str = self.headers.get('Content-Length')
        if not content_length_str:
            self.send_error_response(411, "Length Required")
            return None
            
        try:
            content_length = int(content_length_str)
        except ValueError:
            self.send_error_response(400, "Invalid Content-Length")
            return None
            
        if content_length > max_length:
            self.send_error_response(413, f"Payload Too Large (Max: {max_length} bytes)")
            return None
            
        post_data = self.rfile.read(content_length)
        try:
            return json.loads(post_data.decode('utf-8'))
        except json.JSONDecodeError:
            self.send_error_response(400, "Invalid JSON payload")
            return None

    def do_GET(self):
        print(f"[{datetime.datetime.now().isoformat()}] 📥 GET Request: {self.path}")
        
        # Path Traversal Protection
        normalized_path = os.path.normpath(self.path)
        if '..' in normalized_path or normalized_path.startswith('/../') or normalized_path.startswith('..'):
            print(f"⚠️ [Path Traversal Blocked] from {self.client_address[0]} on {self.path}")
            self.send_error_response(403, "Forbidden")
            return
            
        # Rate Limiting Check
        client_ip = self.client_address[0]
        if not check_rate_limit(client_ip, is_auth=False):
            print(f"⚠️ [Rate Limit GET Blocked] IP: {client_ip} on {self.path}")
            self.send_error_response(429, "Too many requests. Please try again later.")
            return

        if self.path.startswith('/api/my-routes'):
            token = self.headers.get('Authorization', '').replace('Bearer ', '').strip()
            if not token:
                self.send_error_response(401, "Unauthorized")
                return
            
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute("SELECT id FROM users WHERE token=?", (token,))
            user = c.fetchone()
            if not user:
                conn.close()
                self.send_error_response(401, "Invalid token")
                return
            
            user_id = user[0]
            c.execute("SELECT id, name, created_at, route_data, share_token FROM routes WHERE user_id=? ORDER BY created_at DESC", (user_id,))
            routes = []
            for row in c.fetchall():
                routes.append({
                    "id": row[0],
                    "name": row[1],
                    "created_at": row[2],
                    "route_data": json.loads(row[3]),
                    "share_token": row[4]
                })
            conn.close()
            
            self.send_success_response(routes)
            
        elif self.path.startswith('/api/shared-route'):
            from urllib.parse import urlparse, parse_qs
            query = parse_qs(urlparse(self.path).query)
            token = query.get('token', [''])[0]
            
            if not token:
                self.send_error_response(400, "Token missing")
                return
                
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute("SELECT id, name, created_at, route_data FROM routes WHERE share_token=?", (token,))
            row = c.fetchone()
            conn.close()
            
            if not row:
                self.send_error_response(404, "Route not found")
                return
                
            self.send_success_response({
                "id": row[0],
                "name": row[1],
                "created_at": row[2],
                "route_data": json.loads(row[3])
            })

        elif self.path.startswith('/api/search'):
            from urllib.parse import urlparse, parse_qs
            import urllib.parse
            import urllib.request
            
            parsed_url = urlparse(self.path)
            query_params = parse_qs(parsed_url.query)
            
            query = query_params.get('q', [''])[0].strip()
            lat = query_params.get('lat', ['41.0082'])[0].strip()
            lon = query_params.get('lon', ['28.9784'])[0].strip()
            
            if not query:
                self.send_success_response([])
                return
                
            results = []
            
            # --- TRY GOOGLE MAPS AJAX SEARCH FIRST (High POI Accuracy, Free) ---
            try:
                # Google Maps tbm=map AJAX endpoint
                url = f"https://www.google.com/search?tbm=map&authuser=0&hl=tr&gl=tr&q={urllib.parse.quote(query)}"
                
                req = urllib.request.Request(
                    url,
                    headers={
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
                        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
                    }
                )
                
                with urllib.request.urlopen(req, timeout=5) as response:
                    body = response.read().decode('utf-8', errors='ignore')
                    
                if body.startswith(")]}'\n"):
                    body = body[5:]
                    
                data = json.loads(body)
                raw_list = data[0][1]
                
                for item in raw_list:
                    if not isinstance(item, list) or len(item) < 15:
                        continue
                    try:
                        meta = item[14]
                        if not isinstance(meta, list) or len(meta) < 12:
                            continue
                        
                        title = meta[11]
                        lat_val = meta[9][2]
                        lon_val = meta[9][3]
                        
                        address = meta[39]
                        if not address and isinstance(meta[2], list):
                            address = ", ".join([str(x) for x in meta[2] if x])
                            
                        if title and lat_val and lon_val:
                            results.append({
                                "name": title,
                                "display_name": address or title,
                                "lat": float(lat_val),
                                "lon": float(lon_val)
                            })
                    except:
                        pass
                        
            except Exception as g_err:
                print("⚠️ [Google Search Scraper Failed, falling back to Nominatim]", g_err)
                
            # --- FALLBACK TO NOMINATIM IF GOOGLE MAPS SCAN YIELDED NO RESULTS ---
            if not results:
                try:
                    try:
                        f_lat = float(lat)
                        f_lon = float(lon)
                        viewbox = f"{f_lon - 0.2},{f_lat - 0.2},{f_lon + 0.2},{f_lat + 0.2}"
                    except:
                        viewbox = "28.8,40.8,29.2,41.2"
                    
                    url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(query)}&format=json&limit=10&countrycodes=tr&accept-language=tr&viewbox={viewbox}"
                    
                    req = urllib.request.Request(
                        url,
                        headers={
                            'User-Agent': 'AegisRouteApp/1.0 (contact@aegisroute.com)',
                            'Accept-Language': 'tr-TR,tr;q=0.9'
                        }
                    )
                    
                    with urllib.request.urlopen(req, timeout=5) as response:
                        osm_data = json.loads(response.read().decode('utf-8'))
                    
                    for item in osm_data:
                        display_name = item.get('display_name')
                        name = display_name.split(',')[0]
                        results.append({
                            "name": name,
                            "display_name": display_name,
                            "lat": float(item.get('lat')),
                            "lon": float(item.get('lon'))
                        })
                except Exception as osm_err:
                    print("❌ [Nominatim Fallback Failed]", osm_err)
                    
            self.send_success_response(results)

        else:
            super().do_GET()

    def do_POST(self):
        print(f"[{datetime.datetime.now().isoformat()}] 📥 POST Request: {self.path}")
        
        # CSRF Protection
        referer = self.headers.get('Referer')
        origin = self.headers.get('Origin')
        host = self.headers.get('Host')
        
        if origin and host and host not in origin:
            print(f"❌ [CSRF Block] Origin '{origin}' mismatch for host '{host}'")
            self.send_error_response(403, "Forbidden (CSRF check failed)")
            return
            
        if referer and host and host not in referer:
            print(f"❌ [CSRF Block] Referer '{referer}' mismatch for host '{host}'")
            self.send_error_response(403, "Forbidden (CSRF check failed)")
            return
            
        # Rate Limiting Check
        client_ip = self.client_address[0]
        is_auth_route = self.path in ['/api/login', '/api/register']
        if not check_rate_limit(client_ip, is_auth=is_auth_route):
            print(f"⚠️ [Rate Limit POST Blocked] IP: {client_ip} on {self.path}")
            self.send_error_response(429, "Too many requests. Please try again later.")
            return

        if self.path == '/api/register':
            payload = self._read_json_payload(max_length=5120) # 5KB
            if not payload:
                return
                
            username = payload.get('username')
            password = payload.get('password')
            
            if not username or not password:
                self.send_error_response(400, "Username and password required")
                return

            if not re.match(r"^[a-zA-Z0-9_]+$", username):
                self.send_error_response(400, "Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir.")
                return

            if len(username) < 3 or len(username) > 20:
                self.send_error_response(400, "Kullanıcı adı 3 ile 20 karakter arasında olmalıdır.")
                return
                
            if len(password) < 6 or len(password) > 50:
                self.send_error_response(400, "Şifre 6 ile 50 karakter arasında olmalıdır.")
                return
                
            password_hash, salt = hash_password_with_salt(password)
                
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            try:
                c.execute("INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)", (username, password_hash, salt))
                conn.commit()
                self.send_success_response({"message": "Registration successful"})
            except sqlite3.IntegrityError:
                self.send_error_response(400, "Username already exists")
            finally:
                conn.close()
                
        elif self.path == '/api/login':
            payload = self._read_json_payload(max_length=5120) # 5KB
            if not payload:
                return
                
            username = payload.get('username')
            password = payload.get('password')
            
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute("SELECT id, password_hash, salt FROM users WHERE username=?", (username,))
            user = c.fetchone()
            
            if user:
                user_id, stored_hash, salt = user
                test_hash, _ = hash_password_with_salt(password, salt_hex=salt)
                
                if test_hash == stored_hash:
                    token = str(uuid.uuid4())
                    c.execute("UPDATE users SET token=? WHERE id=?", (token, user_id))
                    conn.commit()
                    self.send_success_response({"token": token, "username": username})
                else:
                    self.send_error_response(401, "Invalid credentials")
            else:
                self.send_error_response(401, "Invalid credentials")
            conn.close()
            
        elif self.path == '/api/save-route':
            token = self.headers.get('Authorization', '').replace('Bearer ', '').strip()
            if not token:
                self.send_error_response(401, "Unauthorized")
                return
                
            payload = self._read_json_payload(max_length=1048576) # 1MB limit for routes
            if not payload:
                return
            
            route_id = payload.get('id')
            route_name = payload.get('name', 'Yeni Rota')
            route_data_json = json.dumps(payload.get('route_data', {}))
            
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute("SELECT id FROM users WHERE token=?", (token,))
            user = c.fetchone()
            if not user:
                conn.close()
                self.send_error_response(401, "Invalid token")
                return
                
            user_id = user[0]
            
            if route_id:
                c.execute("SELECT id, share_token FROM routes WHERE id=? AND user_id=?", (route_id, user_id))
                row = c.fetchone()
                if row:
                    share_token = row[1]
                    if not share_token:
                        share_token = uuid.uuid4().hex
                        c.execute("UPDATE routes SET route_data=?, share_token=? WHERE id=? AND user_id=?", 
                                 (route_data_json, share_token, route_id, user_id))
                    else:
                        c.execute("UPDATE routes SET route_data=? WHERE id=? AND user_id=?", 
                                 (route_data_json, route_id, user_id))
                    conn.commit()
                    self.send_success_response({"message": "Route updated", "route_id": route_id, "share_token": share_token})
                else:
                    conn.close()
                    self.send_error_response(404, "Route not found")
                    return
            else:
                share_token = uuid.uuid4().hex
                c.execute("INSERT INTO routes (user_id, name, created_at, route_data, share_token) VALUES (?, ?, ?, ?, ?)",
                         (user_id, route_name, datetime.datetime.now().isoformat(), route_data_json, share_token))
                new_id = c.lastrowid
                conn.commit()
                self.send_success_response({"message": "Route saved", "route_id": new_id, "share_token": share_token})
            conn.close()

        elif self.path == '/api/shared-route':
            payload = self._read_json_payload()
            if not payload:
                return
                
            token = payload.get('share_token')
            route_data = payload.get('route_data')
            
            if not token or not route_data:
                self.send_error_response(400, "Missing data")
                return
                
            try:
                conn = sqlite3.connect(DB_PATH)
                c = conn.cursor()
                
                c.execute("SELECT id FROM routes WHERE share_token=?", (token,))
                if not c.fetchone():
                    conn.close()
                    self.send_error_response(404, "Route not found")
                    return
                    
                c.execute("UPDATE routes SET route_data=? WHERE share_token=?", 
                         (json.dumps(route_data), token))
                conn.commit()
                conn.close()
                self.send_success_response({"message": "Shared route updated"})
            except Exception as e:
                self.send_error_response(500, str(e))

        elif self.path == '/api/route-sync':
            payload = self._read_json_payload(max_length=1048576) # 1MB limit
            if not payload:
                return
            
            try:
                itinerary = payload.get('itinerary', [])
                legs = []
                
                for i in range(len(itinerary) - 1):
                    stop1 = itinerary[i]
                    stop2 = itinerary[i+1]
                    
                    lon1, lat1 = stop1['coords'][1], stop1['coords'][0]
                    lon2, lat2 = stop2['coords'][1], stop2['coords'][0]
                    mode = stop1.get('type_to_next', 'car')
                    
                    legs.append({
                        "from_id": stop1['id'],
                        "to_id": stop2['id'],
                        "duration": "Bilinmiyor",
                        "details": f"{mode.capitalize()} (Düz Hat)",
                        "path": [[lat1, lon1], [lat2, lon2]]
                    })
                
                self.send_success_response({"legs": legs})
                    
            except Exception as e:
                print("❌ Error syncing routes:", e)
                self.send_error_response(500, str(e))
                
        elif self.path == '/api/upload':
            try:
                # Read raw body
                content_length = int(self.headers.get('Content-Length', 0))
                # 4MB limit for base64 encoded payload (~3MB raw file)
                if content_length > 4 * 1024 * 1024:
                    self.send_error_response(413, "Payload too large (Max: 4MB)")
                    return
                    
                body = self.rfile.read(content_length)
                payload = json.loads(body.decode('utf-8'))
                
                if 'image' not in payload:
                    self.send_error_response(400, "No image provided")
                    return
                    
                image_data = payload['image']
                # image_data is expected to be base64 data URL e.g., data:image/png;base64,iVBORw0K...
                header, encoded = image_data.split(",", 1)
                
                import base64
                data = base64.b64decode(encoded)
                
                # Verify Magic Bytes / File Signature to prevent malicious file uploads
                is_valid_image = False
                if data.startswith(b'\x89PNG\r\n\x1a\n'):
                    is_valid_image = True
                elif data.startswith(b'\xff\xd8\xff'):
                    is_valid_image = True
                elif data.startswith(b'RIFF') and b'WEBP' in data[8:16]:
                    is_valid_image = True
                    
                if not is_valid_image:
                    self.send_error_response(400, "Invalid file format. Only PNG, JPEG, and WebP images are allowed.")
                    return
                
                ext = "png"
                if "jpeg" in header or "jpg" in header:
                    ext = "jpg"
                elif "webp" in header:
                    ext = "webp"
                
                filename = f"{uuid.uuid4().hex}.{ext}"
                filepath = os.path.join(UPLOAD_DIR, filename)
                
                with open(filepath, 'wb') as f:
                    f.write(data)
                    
                # Return the URL relative to root
                self.send_success_response({"url": f"/uploads/{filename}"})
                
            except Exception as e:
                print("❌ Error uploading image:", e)
                self.send_error_response(500, str(e))
                
        else:
            super().do_POST()

if __name__ == '__main__':
    os.chdir(SCRIPT_DIR)
    
    port = PORT
    max_tries = 10
    httpd = None
    
    ThreadPoolTCPServer.allow_reuse_address = True
    
    for i in range(max_tries):
        try:
            server_address = ('0.0.0.0', port)
            httpd = ThreadPoolTCPServer(server_address, CustomHandler)
            break
        except OSError as e:
            if e.errno == 98 or "already in use" in str(e).lower() or e.errno == 48:
                print(f"⚠️ Port {port} is already in use. Trying port {port + 1}...")
                port += 1
            else:
                raise e
                
    if not httpd:
        print(f"❌ Error: Could not find an open port starting from {PORT} to {PORT + max_tries - 1}.")
        sys.exit(1)
        
    print(f"❤️ AegisRoute Server is active (Secured!)")
    print(f"🌍 Local: http://localhost:{port}")
    print("Press Ctrl+C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server.")
        sys.exit(0)
