// =============================================================================
// Trinity ESP32 WiFi Bridge - FPGA Control Panel
// =============================================================================
//
// Provides:
// - WiFi Access Point for users
// - Web UI for FPGA control
// - WebSocket for real-time updates
// - UART bridge to FPGA
//
// Usage:
// 1. Upload to ESP32
// 2. Connect to "Trinity-FPGA" WiFi
// 3. Open http://192.168.4.1 or http://trinity.local
// 4. Control FPGA from browser!
//
// Wiring:
//   ESP32 GPIO4 (TX) -----> FPGA Pin L20 (UART_RX)
//   ESP32 GPIO5 (RX) <----- FPGA Pin K20 (UART_TX)
//   ESP32 GND      -----> FPGA GND
//
// =============================================================================

#include <WiFi.h>
#include <WebServer.h>
#include <WebSocketsServer.h>
#include <ESPmDNS.h>
#include <ArduinoJson.h>

// ============================================================================
// Configuration
// ============================================================================

// WiFi Access Point
// AP_SSID and AP_PASSWORD live in secrets.h, which is gitignored.
// Copy secrets.h.example to secrets.h and fill it in before flashing.
#include "secrets.h"

// mDNS hostname
const char* HOSTNAME = "trinity";

// UART to FPGA
#define RX_PIN 5      // ESP32 RX <- FPGA TX
#define TX_PIN 4      // ESP32 TX -> FPGA RX
#define BAUD_RATE 115200

// Web Server ports
#define HTTP_PORT 80
#define WS_PORT 81

// ============================================================================
// Global Objects
// ============================================================================

WebServer server(HTTP_PORT);
WebSocketsServer webSocket = WebSocketsServer(WS_PORT);
HardwareSerial FPGASerial(1);

// FPGA State
struct {
    bool connected;
    unsigned long lastPing;
    unsigned long lastResponse;
    unsigned long packetsReceived;
    unsigned long packetsSent;
    unsigned long errors;
    String statusMessage;
} fpgaState = {
    false, 0, 0, 0, 0, 0, "Disconnected"
};

// ============================================================================
// HTML Web UI
// ============================================================================

const char* getWebPage() {
    return R"rawliteral(
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trinity FPGA Control Panel</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            min-height: 100vh;
            color: white;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        h1 {
            text-align: center;
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        }
        .subtitle {
            text-align: center;
            font-size: 1.2em;
            opacity: 0.8;
            margin-bottom: 30px;
        }
        .status {
            background: rgba(0,0,0,0.3);
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        }
        .status-item {
            text-align: center;
        }
        .status-label {
            font-size: 0.9em;
            opacity: 0.7;
        }
        .status-value {
            font-size: 1.8em;
            font-weight: bold;
        }
        .status-value.online { color: #4CAF50; }
        .status-value.offline { color: #f44336; }
        .controls {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .btn {
            padding: 15px 30px;
            border: none;
            border-radius: 10px;
            font-size: 1.1em;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
            text-transform: uppercase;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .btn:active {
            transform: translateY(0);
        }
        .btn-ping { background: #9C27B0; color: white; }
        .btn-on { background: #4CAF50; color: white; }
        .btn-off { background: #f44336; color: white; }
        .btn-blink { background: #FF9800; color: white; }
        .btn-custom { background: #2196F3; color: white; }
        .log {
            background: rgba(0,0,0,0.4);
            border-radius: 10px;
            padding: 15px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            max-height: 300px;
            overflow-y: auto;
        }
        .log-entry {
            padding: 5px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .log-tx { color: #4CAF50; }
        .log-rx { color: #2196F3; }
        .log-sys { color: #FF9800; }
        .log-err { color: #f44336; }
        .footer {
            text-align: center;
            margin-top: 30px;
            opacity: 0.6;
            font-size: 0.9em;
        }
        .phi { font-size: 1.5em; }
    </style>
</head>
<body>
    <div class="container">
        <h1>⚡ Trinity FPGA</h1>
        <p class="subtitle">φ² + 1/φ² = 3 = TRINITY</p>

        <div class="status">
            <div class="status-item">
                <div class="status-label">Connection</div>
                <div class="status-value" id="status">Connecting...</div>
            </div>
            <div class="status-item">
                <div class="status-label">Packets RX</div>
                <div class="status-value" id="rx">0</div>
            </div>
            <div class="status-item">
                <div class="status-label">Packets TX</div>
                <div class="status-value" id="tx">0</div>
            </div>
            <div class="status-item">
                <div class="status-label">Errors</div>
                <div class="status-value" id="errors">0</div>
            </div>
        </div>

        <div class="controls">
            <button class="btn btn-ping" onclick="sendCmd('PING')">📡 Ping</button>
            <button class="btn btn-on" onclick="sendCmd('LED_ON')">💡 LED ON</button>
            <button class="btn btn-off" onclick="sendCmd('LED_OFF')">🔦 LED OFF</button>
            <button class="btn btn-blink" onclick="sendCmd('LED_BLINK')">✨ Blink</button>
        </div>

        <div class="controls">
            <input type="text" id="hexInput" placeholder="Hex (AA BB CC)"
                   style="padding: 15px; border-radius: 10px; border: none; flex: 1;">
            <button class="btn btn-custom" onclick="sendHex()">Send Hex</button>
        </div>

        <div class="log" id="log">
            <div class="log-entry log-sys">System ready. Connecting to FPGA...</div>
        </div>

        <div class="footer">
            <p class="phi">φ² + 1/φ² = 3</p>
            <p>Trinity FPGA Control Panel v1.0</p>
        </div>
    </div>

    <script>
        var ws = null;
        var stats = { rx: 0, tx: 0, errors: 0 };
        var reconnectTimer = null;

        function log(msg, type = 'sys') {
            var logDiv = document.getElementById('log');
            var entry = document.createElement('div');
            entry.className = 'log-entry log-' + type;
            var time = new Date().toLocaleTimeString();
            entry.textContent = '[' + time + '] ' + msg;
            logDiv.appendChild(entry);
            logDiv.scrollTop = logDiv.scrollHeight;
        }

        function updateStatus() {
            var statusDiv = document.getElementById('status');
            if (ws && ws.readyState === WebSocket.OPEN) {
                statusDiv.textContent = '● Online';
                statusDiv.className = 'status-value online';
            } else {
                statusDiv.textContent = '● Offline';
                statusDiv.className = 'status-value offline';
            }
            document.getElementById('rx').textContent = stats.rx;
            document.getElementById('tx').textContent = stats.tx;
            document.getElementById('errors').textContent = stats.errors;
        }

        function connect() {
            var protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
            var wsUrl = protocol + '//' + location.hostname + ':81/';

            ws = new WebSocket(wsUrl);

            ws.onopen = function() {
                log('Connected to Trinity Gateway', 'sys');
                updateStatus();
                if (reconnectTimer) {
                    clearInterval(reconnectTimer);
                    reconnectTimer = null;
                }
            };

            ws.onmessage = function(event) {
                try {
                    var data = JSON.parse(event.data);
                    if (data.type === 'fpga_rx') {
                        log('FPGA → ESP32: 0x' + data.data, 'rx');
                        stats.rx++;
                        updateStatus();
                    } else if (data.type === 'fpga_tx') {
                        log('ESP32 → FPGA: 0x' + data.data, 'tx');
                        stats.tx++;
                        updateStatus();
                    } else if (data.type === 'status') {
                        document.getElementById('status').textContent = data.message;
                    }
                } catch (e) {
                    log('Error: ' + e.message, 'err');
                }
            };

            ws.onclose = function() {
                log('Disconnected. Reconnecting...', 'err');
                updateStatus();
                if (!reconnectTimer) {
                    reconnectTimer = setInterval(connect, 3000);
                }
            };

            ws.onerror = function(err) {
                log('WebSocket error', 'err');
                stats.errors++;
                updateStatus();
            };
        }

        function sendCmd(cmd) {
            if (ws && ws.readyState === WebSocket.OPEN) {
                var data = { command: cmd };
                ws.send(JSON.stringify(data));
            } else {
                log('Not connected', 'err');
            }
        }

        function sendHex() {
            var input = document.getElementById('hexInput').value;
            // Remove spaces and validate
            var hex = input.replace(/\s/g, '');
            if (/^[0-9A-Fa-f]+$/.test(hex) && hex.length % 2 === 0) {
                sendCmd('HEX:' + hex);
                document.getElementById('hexInput').value = '';
            } else {
                log('Invalid hex format', 'err');
            }
        }

        // Keyboard shortcut
        document.getElementById('hexInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') sendHex();
        });

        // Start connection
        connect();

        // Periodic update
        setInterval(updateStatus, 1000);
    </script>
</body>
</html>
)rawliteral";
}

// ============================================================================
// FPGA Commands
// ============================================================================

const uint8_t CMD_PING      = 0x03;
const uint8_t CMD_LED_ON    = 0x10;
const uint8_t CMD_LED_OFF   = 0x11;
const uint8_t CMD_LED_BLINK = 0x12;

const uint8_t RESP_PONG     = 0x83;
const uint8_t RESP_OK       = 0xFF;
const uint8_t RESP_ACK      = 0xAA;

String getResponseName(uint8_t resp) {
    switch (resp) {
        case RESP_PONG: return "PONG";
        case RESP_OK: return "OK";
        case RESP_ACK: return "ACK";
        default: return "0x" + String(resp, HEX);
    }
}

void sendToFPGA(uint8_t cmd) {
    FPGASerial.write(cmd);
    fpgaState.packetsSent++;
    fpgaState.lastPing = millis();

    // Notify WebSocket clients
    JsonDocument doc;
    doc["type"] = "fpga_tx";
    doc["data"] = String(cmd, HEX);
    String json;
    serializeJson(doc, json);
    webSocket.broadcastTXT(json);
}

void processCommand(String cmd) {
    if (cmd == "PING") {
        sendToFPGA(CMD_PING);
    } else if (cmd == "LED_ON") {
        sendToFPGA(CMD_LED_ON);
    } else if (cmd == "LED_OFF") {
        sendToFGA(CMD_LED_OFF);
    } else if (cmd == "LED_BLINK") {
        sendToFPGA(CMD_LED_BLINK);
    } else if (cmd.startsWith("HEX:")) {
        // Parse hex: "HEX:AABBCC"
        String hex = cmd.substring(4);
        for (unsigned int i = 0; i < hex.length(); i += 2) {
            String byteStr = hex.substring(i, i + 2);
            uint8_t byteVal = (uint8_t)strtol(byteStr.c_str(), NULL, 16);
            sendToFPGA(byteVal);
        }
    }
}

// ============================================================================
// WebSocket Handler
// ============================================================================

void webSocketEvent(uint8_t num, WStype_t type, uint8_t *payload, size_t length) {
    switch (type) {
        case WStype_DISCONNECTED:
            Serial.printf("[%u] Disconnected\n", num);
            break;

        case WStype_CONNECTED:
            Serial.printf("[%u] Connected\n", num);
            // Send current state
            {
                JsonDocument doc;
                doc["type"] = "status";
                doc["message"] = fpgaState.connected ? "FPGA Connected" : "FPGA Disconnected";
                doc["rx"] = fpgaState.packetsReceived;
                doc["tx"] = fpgaState.packetsSent;
                String json;
                serializeJson(doc, json);
                webSocket.sendTXT(num, json);
            }
            break;

        case WStype_TEXT:
            Serial.printf("[%u] Command: %s\n", num, payload);
            {
                JsonDocument doc;
                DeserializationError error = deserializeJson(doc, payload);
                if (!error && doc.containsKey("command")) {
                    String command = doc["command"].as<String>();
                    processCommand(command);
                }
            }
            break;

        case WStype_BIN:
        case WStype_ERROR:
        case WStype_FRAGMENT_TEXT_START:
        case WStype_FRAGMENT_BIN_START:
        case WStype_FRAGMENT:
        case WStype_FRAGMENT_FIN:
            break;
    }
}

// ============================================================================
// HTTP Server Handlers
// ============================================================================

void handleRoot() {
    server.send(200, "text/html", getWebPage());
}

void handleAPI() {
    // REST API endpoint: /api?command=PING
    if (server.hasArg("command")) {
        String command = server.arg("command");
        processCommand(command);

        JsonDocument doc;
        doc["status"] = "ok";
        doc["command"] = command;
        String json;
        serializeJson(doc, json);
        server.send(200, "application/json", json);
    } else {
        // Get status
        JsonDocument doc;
        doc["fpga_connected"] = fpgaState.connected;
        doc["packets_rx"] = fpgaState.packetsReceived;
        doc["packets_tx"] = fpgaState.packetsSent;
        doc["uptime"] = millis() / 1000;
        String json;
        serializeJson(doc, json);
        server.send(200, "application/json", json);
    }
}

void handleNotFound() {
    String message = "File Not Found\n\n";
    message += "URI: ";
    message += server.uri();
    message += "\nMethod: ";
    message += (server.method() == HTTP_GET) ? "GET" : "POST";
    message += "\nArguments: ";
    message += server.args();
    message += "\n";
    for (uint8_t i = 0; i < server.args(); i++) {
        message += " " + server.argName(i) + ": " + server.arg(i) + "\n";
    }
    server.send(404, "text/plain", message);
}

// ============================================================================
// Setup
// ============================================================================

void setup() {
    // Initialize Serial
    Serial.begin(115200);
    Serial.println("\n\n=== Trinity ESP32 WiFi Bridge ===");
    Serial.println("φ² + 1/φ² = 3 = TRINITY\n");

    // Initialize FPGA Serial
    FPGASerial.begin(BAUD_RATE, SERIAL_8N1, RX_PIN, TX_PIN);
    Serial.println("FPGA UART initialized");

    // Configure WiFi as Access Point
    WiFi.mode(WIFI_AP);
    WiFi.softAP(AP_SSID, AP_PASSWORD);

    IPAddress IP = WiFi.softAPIP();
    Serial.print("AP IP address: ");
    Serial.println(IP);

    // Start mDNS
    if (MDNS.begin(HOSTNAME)) {
        Serial.println("mDNS responder started: http://" + String(HOSTNAME) + ".local");
    }

    // Setup HTTP server
    server.on("/", handleRoot);
    server.on("/api", handleAPI);
    server.onNotFound(handleNotFound);
    server.begin();
    Serial.println("HTTP server started on port " + String(HTTP_PORT));

    // Setup WebSocket server
    webSocket.begin();
    webSocket.onEvent(webSocketEvent);
    Serial.println("WebSocket server started on port " + String(WS_PORT));

    Serial.println("\n=== System Ready ===\n");
    Serial.println("Connect to WiFi: " + String(AP_SSID));
    Serial.println("Then open: http://" + String(IP));
    Serial.println("Or: http://" + String(HOSTNAME) + ".local\n");
}

// ============================================================================
// Main Loop
// ============================================================================

void loop() {
    webSocket.loop();
    server.handleClient();

    // Check for FPGA responses
    if (FPGASerial.available()) {
        uint8_t data = FPGASerial.read();
        fpgaState.packetsReceived++;
        fpgaState.lastResponse = millis();
        fpgaState.connected = true;

        String respName = getResponseName(data);
        Serial.println("FPGA → ESP32: " + respName + " (0x" + String(data, HEX) + ")");

        // Send to WebSocket clients
        JsonDocument doc;
        doc["type"] = "fpga_rx";
        doc["data"] = String(data, HEX);
        doc["name"] = respName;
        String json;
        serializeJson(doc, json);
        webSocket.broadcastTXT(json);
    }

    // Check for timeout (if no response for 5 seconds)
    if (fpgaState.connected && millis() - fpgaState.lastResponse > 5000) {
        fpgaState.connected = false;
        Serial.println("FPGA connection timeout");
    }
}
