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
        
    print(f"❤️ Nazen Rota Server is active!")
    print(f"🌍 Local: http://localhost:{port}")
    print(f"🔒 Tailscale/Network: Access via http://<your-tailscale-ip>:{port}")
    print("Press Ctrl+C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server.")
        sys.exit(0)

