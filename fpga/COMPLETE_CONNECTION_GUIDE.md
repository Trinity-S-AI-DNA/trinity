# Complete Guide to Connections and WiFi for Trinity FPGA

## Part 1: Where to Connect DSlogic Plus?

### Connection Points on FPGA Board

```
┌─────────────────────────────────────────────────────────────────────┐
│              QMTECH XC7A100TFGG676 - Connection Points           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    FPGA Chip (BGA676)                        │  │
│  │                                                               │  │
│  │   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │  │
│  │   │ Bank 0  │  │ Bank 14 │  │ Bank 34 │  │ Bank 35 │← ESP32 │  │
│  │   │  (3.3V) │  │  (3.3V) │  │  (3.3V) │  │  (3.3V) │         │  │
│  │   └─────────┘  └─────────┘  └─────────┘  └─────────┘        │  │
│  │                                                               │  │
│  │   Total: ~300+ user pins!                                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  PLS-EXT connector (if available)                              │   │
│  │  ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐                  │   │
│  │  │GND│VCC│IO1│IO2│IO3│IO4│IO5│IO6│IO7│IO8│ ...              │   │
│  │  └───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 16 Channels — What's Enough?

| Channel | Signal | Description |
|---------|---------|-------------|
| CH0 | ESP32_TX → FPGA_RX | UART data |
| CH1 | FPGA_TX → ESP32_RX | UART data |
| CH2 | ESP32_SCLK | SPI clock |
| CH3 | ESP32_MOSI | SPI data → FPGA |
| CH4 | ESP32_MISO | SPI data → ESP32 |
| CH5 | ESP32_CS | SPI chip select |
| CH6 | FPGA_CLK | 50 MHz system clock |
| CH7 | LED output | LED status |
| CH8 | VSA_result[0] | VSA result |
| CH9 | VSA_result[1] | VSA result |
| CH10 | state[0] | FSM state |
| CH11 | state[1] | FSM state |
| CH12 | trigger_out | Oscilloscope trigger |
| CH13 | spare | Spare |
| CH14 | spare | Spare |
| CH15 | spare | Spare |

### How to Physically Connect

**Method 1: Pogo Pin Test Points**
```
        ┌─────┐
        │  ○  │ ← Pogo pin pressed against pin
        └─────┘
           │
           │ ← Spring probe
           │
        ┌───┴───┐
        │ DSlogic│
        └───────┘
```

**Method 2: Test clips (alligator clips)**
```
FPGA Pin ──[🔧 alligator]─── Wire ──── DSlogic CH0
```

**Method 3: Jumper wires**
```
FPGA Pin ──┐
           │ ← Dupont wire (male-to-female)
DSlogic ───┘
```

---

## Part 2: WiFi on FPGA

### WiFi Connection Options

```
┌─────────────────────────────────────────────────────────────────────┐
│                      WiFi Options for FPGA                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Option 1: ESP32 as bridge (RECOMMENDED)                        │
│  ┌─────────┐    UART/SPI    ┌─────────┐    Ethernet/WiFi        │  │
│  │ ESP32   │ ←────────────→ │  FPGA   │ ←───────────────────────│  │
│  │ + WiFi  │                │         │                         │  │
│  └─────────┘                └─────────┘                         │  │
│       │                                                           │  │
│       └─── WiFi AP → Users connect                               │  │
│                                                                     │
│  Option 2: Ethernet PHY + WiFi Router                             │
│  ┌─────────┐    RGMII      ┌─────────┐    ┌──────────┐          │  │
│  │  FPGA   │ ←────────────→│ Ethernet│ ←→│ WiFi AP  │          │  │
│  └─────────┘               │   PHY   │    └──────────┘          │  │
│                             └─────────┘                           │  │
│                                                                     │
│  Option 3: ESP32 WROVER with Ethernet                                │
│  ┌─────────┐    SPI         ┌─────────┐    ┌──────────┐          │  │
│  │ESP32-WRO│ ←────────────→ │  FPGA   │    │ Ethernet │          │  │
│  │+WiFi+Eth│                │         │    │ + WiFi   │          │  │
│  └─────────┘                └─────────┘    └──────────┘          │  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### RECOMMENDATION: ESP32 as WiFi Bridge

**Why this is the best option:**

| Plus | Explanation |
|------|-------------|
| ✅ Simple | Already have UART bridge |
| ✅ Cheap | ESP32 costs ~$5 |
| ✅ WiFi + Bluetooth | Both included |
| ✅ HTTPS | ESP32 supports TLS |
| ✅ Easy UI | Web interface |
| ✅ OTA | Over-the-air updates |

---

## Part 3: System Architecture for Users

```
┌─────────────────────────────────────────────────────────────────────┐
│               Trinity FPGA System - User Experience                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                         USER                              │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │   │
│  │  │   Web UI    │  │ Mobile App  │  │   CLI Tool  │         │   │
│  │  │  (Browser)  │  │  (iOS/Android)│  │  (Python)   │         │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │   │
│  └─────────┼─────────────────┼─────────────────┼────────────────┘   │
│            │                 │                 │                    │
│            └─────────────────┼─────────────────┘                    │
│                              │                                      │
│                         WiFi/Ethernet                              │
│                              │                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    ESP32 Gateway                               │ │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │ │
│  │  │   WiFi AP   │    │  Web Server │    │   REST API  │       │ │
│  │  │   (mDNS)    │    │  (Port 80)  │    │  (Port 8080)│       │ │
│  │  └─────────────┘    └──────┬──────┘    └──────┬──────┘       │ │
│  │                            │                   │               │ │
│  │  ┌──────────────────────────────────────────────────────┐     │ │
│  │  │            Protocol Bridge (UART/SPI)                │     │ │
│  │  └────────────────────┬───────────────────────────────┘     │ │
│  └───────────────────────┼──────────────────────────────────────┘ │
│                            │ UART/SPI                              │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    Trinity FPGA                               │ │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │ │
│  │  │   VSA Core  │    │   Control   │    │  Interface  │       │ │
│  │  │  (Compute)  │    │   Logic     │    │   Bridge    │       │ │
│  │  └─────────────┘    └──────┬──────┘    └─────────────┘       │ │
│  └───────────────────────────────┼───────────────────────────────┘ │
│                                  │                                  │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    Results/Output                             │ │
│  │  • LED indication                                              │ │
│  │  • 7-segment display (opt.)                                    │ │
│  │  • HDMI/Video output (opt.)                                    │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Part 4: How Users Will Work

### Scenario 1: Web UI (Simplest)

```
┌─────────────────────────────────────────────────────────────────────┐
│  User opens browser:                                            │
│                                                                     │
│  1. Connect to WiFi: "Trinity-FPGA"                           │
│  2. Go to: http://trinity.local  (or 192.168.4.1)           │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Trinity Control Panel                    │   │
│  │  ╔═════════════════════════════════════════════════════════╗ │   │
│  │  ║  Status:                                               ║ │   │
│  │  ║    ○ FPGA: Running                                     ║ │   │
│  │  ║    ○ VSA: Active (157 MOPS)                            ║ │   │
│  │  ║    ○ Temperature: 42°C                                  ║ │   │
│  │  ║                                                         ║ │   │
│  │  ║  Controls:                                              ║ │   │
│  │  ║    [LED ON]  [LED OFF]  [BLINK]                         ║ │   │
│  │  ║                                                         ║ │   │
│  │  ║  VSA Operations:                                        ║ │   │
│  │  ║    Vector: [__________________________________]        ║ │   │
│  │  ║    Search: [______________________] [SEARCH]           ║ │   │
│  │  ║                                                         ║ │   │
│  │  ║  Results:                                               ║ │   │
│  │  ║    1. item_123.vsa   similarity: 0.95                  ║ │   │
│  │  ║    2. item_456.vsa   similarity: 0.87                  ║ │   │
│  │  ║                                                         ║ │   │
│  │  ║  [Upload]  [Download]  [Settings]                      ║ │   │
│  │  ╚═════════════════════════════════════════════════════════╝ │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Scenario 2: Mobile App

```
┌─────────────────────────────────────────────────────────────────────┐
│  Trinity Mobile App (iOS/Android)                                  │
│                                                                     │
│  ┌───────────────────────────────────────────┐                     │
│  │  ┌─────────────────────────────────────┐  │                     │
│  │  │         TRINITY                     │  │                     │
│  │  │    φ² +1/φ² = 3                    │  │                     │
│  │  ├─────────────────────────────────────┤  │                     │
│  │  │                                     │  │                     │
│  │  │  Status: ● Running                  │  │                     │
│  │  │  MOPS:   157                         │  │                     │
│  │  │  Temp:   42°C                         │  │                     │
│  │  │                                     │  │                     │
│  │  │  ┌─────┐ ┌─────┐ ┌─────┐            │  │                     │
│  │  │  │ LED │ │VSA  │ │CFG  │            │  │                     │
│  │  │  │ ON  │ │RUN  │ │     │            │  │                     │
│  │  │  └─────┘ └─────┘ └─────┘            │  │                     │
│  │  │                                     │  │                     │
│  │  │  Results:                            │  │                     │
│  │  │  □ item_123 (95%)                    │  │                     │
│  │  │  □ item_456 (87%)                    │  │                     │
│  │  │                                     │  │                     │
│  │  └─────────────────────────────────────┘  │                     │
│  └───────────────────────────────────────────┘                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Scenario 3: CLI Tool

```
$ trinity-cli --host trinity.local status

Trinity FPGA Status
════════════════════
FPGA:      XC7A100T
Status:    Running
MOPS:      157
Temp:      42°C
Uptime:    2d 4h 32m

$ trinity-cli vsa search --vector "hello world"
Searching...
  ✓ item_123.vsa (similarity: 0.95)
  ✓ item_456.vsa (similarity: 0.87)
  ✓ item_789.vsa (similarity: 0.76)

$ trinity-cli led --blink
OK: LED blinking enabled
```

---

## Part 5: Implementing WiFi Bridge on ESP32

### ESP32 Code (WebSocket Server)

```cpp
// esp32_wifi_bridge.ino
#include <WiFi.h>
#include <WebServer.h>
#include <WebSocketsServer.h>

// WiFi credentials
const char* ssid = "your-ssid";          // keep real values in a gitignored secrets.h
const char* password = "your-wifi-password";

WebServer server(80);
WebSocketsServer webSocket = WebSocketsServer(81);

HardwareSerial FPGASerial(1);

// WebSocket event handler
void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload,
                    size_t length) {
    switch(type) {
        case WStype_DISCONNECTED:
            Serial.printf("[%u] Disconnected!\n", num);
            break;

        case WStype_CONNECTED:
            Serial.printf("[%u] Connected!\n", num);
            break;

        case WStype_TEXT:
            // Get command from Web UI
            Serial.printf("[%u] Command: %s\n", num, payload);

            // Send to FPGA
            if (strcmp((char*)payload, "PING") == 0) {
                FPGASerial.write(0x03);
            } else if (strcmp((char*)payload, "LED_ON") == 0) {
                FPGASerial.write(0x10);
            } else if (strcmp((char*)payload, "LED_OFF") == 0) {
                FPGASerial.write(0x11);
            }
            break;
    }
}

void setup() {
    Serial.begin(115200);
    FPGASerial.begin(115200, SERIAL_8N1, 5, 4); // RX=5, TX=4

    // WiFi AP mode
    WiFi.softAP(ssid, password);
    IPAddress IP = WiFi.softAPIP();
    Serial.print("AP IP address: ");
    Serial.println(IP);

    // WebSocket server
    webSocket.begin();
    webSocket.onEvent(webSocketEvent);

    // HTTP server for Web UI
    server.on("/", []() {
        server.send(200, "text/html", getWebPage());
    });

    server.begin();
    Serial.println("HTTP server started");
}

void loop() {
    webSocket.loop();
    server.handleClient();

    // Relay FPGA responses to WebSocket
    if (FPGASerial.available()) {
        uint8_t data = FPGASerial.read();
        char msg[32];
        sprintf(msg, "{\"fpga_response\": \"0x%02X\"}", data);
        webSocket.broadcastTXT(msg);
    }
}

String getWebPage() {
    return R"(
    <!DOCTYPE html>
    <html>
    <head>
        <title>Trinity Control</title>
        <style>
            body { font-family: Arial; padding: 20px; }
            .btn { padding: 10px 20px; margin: 5px; cursor: pointer; }
            .green { background: #4CAF50; color: white; }
            .red { background: #f44336; color: white; }
        </style>
    </head>
    <body>
        <h1>Trinity FPGA Control</h1>
        <div>
            <button class="btn green" onclick="send('LED_ON')">LED ON</button>
            <button class="btn red" onclick="send('LED_OFF')">LED OFF</button>
            <button class="btn" onclick="send('PING')">PING</button>
        </div>
        <div id="log"></div>
        <script>
            var ws = new WebSocket('ws://' + window.location.hostname + ':81/');
            ws.onmessage = function(event) {
                var data = JSON.parse(event.data);
                document.getElementById('log').innerHTML +=
                    '<p>FPGA: ' + data.fpga_response + '</p>';
            };
            function send(cmd) {
                ws.send(cmd);
            }
        </script>
    </body>
    </html>
    )";
}
```

---

## Part 6: Overall Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FULL ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Users                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                        │
│  │ Browser  │  │ Mobile   │  │  CLI     │                        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                        │
│       │             │             │                               │
│       └─────────────┼─────────────┘                               │
│                     │                                              │
│                  WiFi/Ethernet                                     │
│                     │                                              │
│       ┌─────────────┴─────────────┐                               │
│       │      ESP32 Gateway        │                               │
│       │  ┌─────────────────────┐  │                               │
│       │  │  WebSocket Server  │  │                               │
│       │  │  HTTP Server       │  │                               │
│       │  │  REST API          │  │                               │
│       │  │  mDNS (trinity.local)│                               │
│       │  └─────────┬───────────┘  │                               │
│       │            │ UART/SPI     │                               │
│       └────────────┼──────────────┘                               │
│                    │                                              │
│       ┌────────────┴─────────────┐                               │
│       │    Trinity FPGA          │                               │
│       │  ┌─────────────────────┐  │                               │
│       │  │   UART/SPI Bridge   │  │                               │
│       │  ├─────────────────────┤  │                               │
│       │  │   VSA Compute Core  │  │                               │
│       │  ├─────────────────────┤  │                               │
│       │  │   Control Logic     │  │                               │
│       │  └─────────────────────┘  │                               │
│       └──────────────────────────┘                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Part 7: Implementation Plan

### Step 1: Basic UART Bridge (current)
```
ESP32 ←UART→ FPGA
```

### Step 2: Add WiFi AP
```
User → WiFi → ESP32 ←UART→ FPGA
```

### Step 3: Web UI
```
User → Browser → WiFi → ESP32 ←UART→ FPGA
```

### Step 4: Mobile App
```
User → App → WiFi → ESP32 ←UART→ FPGA
```

### Step 5: Cloud Integration (opt.)
```
User → App → Cloud → WiFi → ESP32 ←UART→ FPGA
```

---

## Part 8: How Users Connect

### Initial Setup (one time)
```
1. Power on device
2. Connect to WiFi: "Trinity-FPGA"
3. Open browser: http://192.168.4.1
4. Configure:
   - Device name
   - Home WiFi (for bridge mode)
   - Admin password
5. Done!
```

### Daily Use
```
1. Power on device (auto-connect to home WiFi)
2. Open: http://trinity.local
3. Work!
```

---

## Summary

| Question | Answer |
|--------|-------|
| **Where to connect DSlogic?** | ~300 pins on FPGA, 16 channels enough for everything |
| **How to WiFi on FPGA?** | Via ESP32 bridge (simpler and cheaper) |
| **How from computer?** | Web UI (browser) or Mobile App |
| **How for users?** | Simple interface, no technical knowledge needed |

φ² + 1/φ² = 3 = TRINITY
