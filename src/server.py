#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys

PORT = 8080

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS for convenience
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def do_POST(self):
        if self.path == '/api/route-sync':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            import json
            import urllib.request
            
            try:
                payload = json.loads(post_data.decode('utf-8'))
                itinerary = payload.get('itinerary', [])
                
                # Fetch OpenRouter API key from LLM_Council/.env or env variable
                api_key = None
                script_dir = os.path.dirname(os.path.abspath(__file__))
                env_path = os.path.join(script_dir, '../../LLM_Council/.env')
                if os.path.exists(env_path):
                    with open(env_path, 'r') as f:
                        for line in f:
                            if line.strip().startswith('OPENROUTER_API_KEY='):
                                api_key = line.split('=', 1)[1].strip()
                
                if not api_key:
                    api_key = os.environ.get('OPENROUTER_API_KEY')
                
                if not api_key:
                    # Try reading from Antigravity Sub Agent Mode/.env
                    alt_env = os.path.join(script_dir, '../../Antigravity Sub Agent Mode/.env')
                    if os.path.exists(alt_env):
                        with open(alt_env, 'r') as f:
                            for line in f:
                                if line.strip().startswith('OPENROUTER_API_KEY='):
                                    api_key = line.split('=', 1)[1].strip()

                if not api_key:
                    raise Exception("OPENROUTER_API_KEY not found in env or configuration files.")

                # Prompt Gemini via OpenRouter
                prompt = (
                    "You are a high-resolution geolocation routing agent for Istanbul, Turkey.\n"
                    "You will be given a sequential list of stops (with GPS coordinates and travel mode to next stop).\n"
                    "For each consecutive pair of stops (from index i to i+1), generate a highly detailed list of "
                    "intermediate coordinates that follow the actual streets, walking paths, ferry channels, or bus roads.\n"
                    "Do not draw straight diagonal lines. Instead, follow real streets (e.g. Hakimiyet-i Milliye Cd., Paşalimanı Cd., Üsküdar Sahil Yolu).\n"
                    "Keep the density of coordinates high enough to snap smoothly to roads on Leaflet map.\n"
                    "Also, estimate the travel duration in minutes (e.g., '12 dakika') and provide detailed route instructions "
                    "in Turkish (such as bus names, ferry lines, or walking directions, for example '12A otobüsü' or 'Fethi Paşa Korusu içinden geçiş').\n\n"
                    "Itinerary Data:\n"
                    f"{json.dumps(itinerary, indent=2)}\n\n"
                    "Output format MUST be strict JSON matching this schema, with no markdown wrappers, no backticks, and no extra text:\n"
                    "{\n"
                    "  \"legs\": [\n"
                    "    {\n"
                    "      \"from_id\": 1,\n"
                    "      \"to_id\": 2,\n"
                    "      \"duration\": \"10 dakika\",\n"
                    "      \"details\": \"M5 Metro hattı kullanıldı.\",\n"
                    "      \"path\": [\n"
                    "        [41.02758, 29.01518],\n"
                    "        [41.02610, 29.01540],\n"
                    "        ...\n"
                    "        [41.02300, 29.01600]\n"
                    "      ]\n"
                    "    }\n"
                    "  ]\n"
                    "}"
                )

                # Query OpenRouter API using urllib
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://aegisroute.local",
                    "X-Title": "AegisRoute AI Routing Sync"
                }
                
                req_payload = {
                    "model": "google/gemini-2.5-pro",
                    "messages": [
                        {"role": "user", "content": prompt}
                    ],
                    "response_format": {"type": "json_object"}
                }
                
                req = urllib.request.Request(
                    "https://openrouter.ai/api/v1/chat/completions",
                    data=json.dumps(req_payload).encode('utf-8'),
                    headers=headers,
                    method='POST'
                )
                
                with urllib.request.urlopen(req) as response:
                    res_body = response.read().decode('utf-8')
                    res_json = json.loads(res_body)
                    completion_text = res_json['choices'][0]['message']['content']
                    
                    # Send response back to browser client
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(completion_text.encode('utf-8'))
                    
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                err_response = {"error": str(e)}
                self.wfile.write(json.dumps(err_response).encode('utf-8'))
                print("❌ Error syncing routes:", e)
        else:
            super().do_POST()

if __name__ == '__main__':
    # Move to the directory containing this script to serve static files from there
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    port = PORT
    max_tries = 10
    httpd = None
    
    socketserver.TCPServer.allow_reuse_address = True
    
    for i in range(max_tries):
        try:
            server_address = ('0.0.0.0', port)
            httpd = socketserver.TCPServer(server_address, CustomHandler)
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
        
    print(f"❤️ AegisRoute Server is active!")
    print(f"🌍 Local: http://localhost:{port}")
    print(f"🔒 Tailscale/Network: Access via http://<your-tailscale-ip>:{port}")
    print("Press Ctrl+C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server.")
        sys.exit(0)

