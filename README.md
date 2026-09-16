<p align="center">
  <img src="web/public/icons/logo.svg" alt="KV Files PRO Logo" width="120" height="120" style="border-radius: 26px; box-shadow: 0 14px 36px rgba(37,99,235,0.3);">
</p>

<h1 align="center">⚡ KV Files PRO (kv-file-pro)</h1>

<p align="center">
  <strong>Military-grade, ultra-fast commercial web file manager & studio workspace.</strong><br>
  Fusing the cascading elegance of <b>macOS Miller Columns</b> with <b>Windows Explorer precision</b>.<br>
  <i>Built with a pure Rust (Axum + Tokio) backend, embedded SQLite WAL, offline Ed25519 asymmetric licensing, and 3D CAD / Adobe Creative Suite studios.</i>
</p>

<p align="center">
  <a href="https://github.com/vndangkhoa/kv-file-pro"><img src="https://img.shields.io/badge/Repository-Private-blueviolet?style=for-the-badge&logo=github&color=7c3aed" alt="Private Repo"></a>
  <a href="https://hub.docker.com/r/vndangkhoa/kv-file-pro"><img src="https://img.shields.io/docker/pulls/vndangkhoa/kv-file-pro?style=for-the-badge&logo=docker&logoColor=white&label=Docker%20Hub&color=2563eb" alt="Docker Hub"></a>
  <a href="https://github.com/vndangkhoa/kv-file-pro/releases"><img src="https://img.shields.io/badge/Release-v2.1.0-emerald?style=for-the-badge&logo=github&color=059669" alt="Latest Release"></a>
  <a href="#-kv-files-pro--enterprise--commercial-edition"><img src="https://img.shields.io/badge/Edition-PRO_Commercial-amber?style=for-the-badge&logo=auth0&logoColor=white&color=d97706" alt="PRO Edition"></a>
</p>

<p align="center">
  <a href="#-quick-start-30-seconds"><b>Quick Start</b></a> •
  <a href="#-why-kv-files"><b>Why KV Files?</b></a> •
  <a href="#-killer-features"><b>Features</b></a> •
  <a href="#-keyboard-shortcuts"><b>Shortcuts</b></a> •
  <a href="#-documentation--api"><b>API & Docs</b></a> •
  <a href="#-star-history"><b>Star History</b></a>
</p>

---

## ⚡ Why KV Files?

Most self-hosted file management tools force you to pick between slow, monolithic enterprise clouds (like Nextcloud) or overly simplistic directory list scripts (like basic FileBrowser).

**KV Files** delivers a modern, desktop-grade experience packed into a **single, ultra-lightweight binary**:

| Feature | 🚀 **KV Files** | 📁 FileBrowser | ☁️ Nextcloud |
| :--- | :---: | :---: | :---: |
| **Backend Engine** | **Pure Rust (Axum + Tokio)** | Go | PHP + Apache / Nginx |
| **Memory Footprint (Idle)** | **⚡ ~15 MB RAM** | ~30 MB RAM | 500 MB+ RAM |
| **macOS Miller Columns** | **✅ Yes (Keyboard arrow cascading)** | ❌ No | ❌ No |
| **Dual-Pane Split View** | **✅ Yes (`Alt + S` Commander mode)** | ❌ No | ❌ No |
| **Real-Time Sync** | **✅ Linux `inotify` + WebSockets** | ⚠️ Polling / refresh | ⚠️ Heavy cron / Redis |
| **Lockscreen Media Streaming** | **✅ W3C Media Session (iOS & Android)** | ❌ Basic HTML5 | ⚠️ App-dependent |
| **NAS & Docker Badging** | **✅ Auto-detects Synology/TrueNAS/Unraid** | ❌ Manual paths | ❌ Complex plugins |
| **Public Share Landing** | **✅ Branded `/share/{token}` portal** | ⚠️ Basic file link | ✅ Complex link share |
| **Single Static Binary** | **✅ Yes (Embedded React SPA + SQLite)** | ✅ Yes | ❌ Multi-container stack |

---

## 📸 Interface & Layout Highlights

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [≡] 🔍 Quick Search (Ctrl+K)   [ /storage/photos/2026/vacation ] [⟳]   [Columns ▾] [⚙]│
├───────────────┬──────────────────┬──────────────────┬──────────────────┬───────────────┤
│ 📂 STORAGE    │ 📁 2024          │ 📁 Summer        │ 🖼️ beach.jpg      │ 🖼️ beach.jpg  │
│  ├─ photos    │ 📁 2025          │ 📁 Roadtrip      │ 🖼️ sunset.png     │ 3.2 MB • JPEG │
│  ├─ documents │ 📁 2026 ──▶      │ 📁 Mountain      │ 🎥 vlog.mp4      │ 4032 x 3024   │
│  └─ backups   │                  │ 📁 Vacation ──▶  │ 📄 notes.txt     │ [Open] [Share]│
│               │                  │                  │                  │ [Download]    │
└───────────────┴──────────────────┴──────────────────┴──────────────────┴───────────────┘
```

- **macOS Finder Miller Columns**: Instant cascading directory traversal with smooth horizontal scrolling.
- **Spacebar Quick Look**: Preview photos, 4K videos, markdown notes, code, and PDFs instantly without leaving your folder.
- **Windows Explorer Detailed List**: Multi-column sorting (`Name`, `Size`, `Date Modified`), row multi-select, and inline `F2` renaming.
- **Dual-Pane Commander Split (`Alt + S`)**: Browse two disks side-by-side; copy (`F5`) or move (`F6`) files seamlessly.
- **Mobile First PWA**: Off-canvas touch drawer, thumb-zone floating action button (FAB), and swipe gestures for phones and tablets.

---

## 🎯 Killer Features

### 1. 🍏 Desktop-Grade Miller Columns & Keyboard Control
Traverse deep folder hierarchies with zero mouse clicks. Use `↑`/`↓` to browse items, `→` to expand subfolders into fresh columns, `←` to navigate backward, and <kbd>Space</kbd> to trigger Quick Look preview.

### 2. ⚡ Sub-Millisecond Kernel Sync (`inotify` + WebSockets)
Changes made on your host machine—via SSH, `rsync`, background downloaders (qBittorrent/Transmission), or automated backup scripts—are caught by Linux kernel `inotify` and instantly broadcast to all connected browser tabs over WebSockets. **Zero UI reloading or manual refreshes required.**

### 3. 🎵 Native Lockscreen Playcards (W3C Media Session)
Stream MP3, FLAC, AAC, and MP4 media directly from your server. KV Files hooks into the **W3C Media Session API**, providing full playback controls, scrubber bars, and track metadata directly on:
- **iOS Dynamic Island** and Lock Screen
- **Android Notifications** and Media Controls
- **macOS & Windows** hardware media keys

### 4. 🏷️ Intelligent NAS & Server Badges with "Simple Mode"
KV Files automatically inspects mounted paths and contextually badges known environments:
- **Synology DSM**: `@eaDir`, shared folders, volume markers
- **TrueNAS CORE / SCALE**: ZFS dataset points and pools
- **Unraid**: Array shares and cache disk mounts
- **Docker Stacks**: Service container paths
- **"Simple Mode" Switch**: One-click toggle that hides OS plumbing and hidden clutter for non-technical family members.

### 5. 🌐 Dedicated Public Share Portals
Generate share links with expiration dates and optional password protection. Directs visitors to a clean, branded `/share/{token}` landing page with:
- In-browser preview for images, video, audio, code, and documents
- 1-click single-file download
- On-the-fly streaming zip download for entire folders

### 6. 🔒 Enterprise-Grade Security
- **Argon2id** password hashing
- RFC 6238 **TOTP Two-Factor Authentication (2FA)** with live QR codes
- Filesystem sandboxing (`dunce::canonicalize`) to eliminate directory traversal risks
- Embedded **SQLite WAL** mode for high-concurrency metadata storage

---

## 🚀 Quick Start (30 Seconds)

### Option A: One-Command Native Launch Script (Recommended)

Start KV Files natively on your machine with the built-in management script:

```bash
# Start in background (daemon mode)
./launch.sh start

# Or start in foreground mode
./launch.sh start --fg

# Check status, logs, or stop
./launch.sh status
./launch.sh logs
./launch.sh stop
```

Open **`http://localhost:8866`** in your browser to complete initial administrator setup.

---

### Option B: One-Command Docker Run

Launch KV Files PRO via Docker container:

```bash
docker run -d \
  --name kv-file-pro \
  -p 8866:8866 \
  -v ./data:/data \
  -v /path/to/my/storage:/storage \
  --restart unless-stopped \
  vndangkhoa/kv-file-pro:latest
```

Open **`http://localhost:8866`** in your browser to complete initial administrator setup.

---

### Option C: Docker Compose (Production Ready)

Save the following as `docker-compose.yml`:

```yaml
services:
  kv-file-pro:
    image: vndangkhoa/kv-file-pro:latest
    # Or GHCR (Private):
    # image: ghcr.io/vndangkhoa/kv-file-pro:latest
    container_name: kv-file-pro
    restart: unless-stopped
    ports:
      - "8866:8866"
    environment:
      - KV_HOST=0.0.0.0
      - KV_PORT=8866
      - KV_DATA_DIR=/data
      # Format: [label]:[container_path]:[label2]:[container_path2]
      - KV_STORAGE_ROOTS=photos:/storage/photos:documents:/storage/docs:backups:/storage/backups
      # Optional: Master Offline Ed25519 Pro License Key
      # - KV_LICENSE_KEY=KVPRO-...
      - RUST_LOG=kv_files=info,tower_http=info
    volumes:
      # Persistent database, user sessions, and trash bin
      - ./data:/data
      # Storage mounts (host_path:container_path)
      - /mnt/storage/photos:/storage/photos
      - /mnt/storage/documents:/storage/docs
      - /mnt/storage/backups:/storage/backups
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8866/api/v1/auth/setup-status || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
```

Start the container:
```bash
docker compose up -d
```

---

## 📦 Pre-Built Container Registries

Multi-architecture images (`linux/amd64`, `linux/arm64`) are published continuously:

| Registry | Image Identifier | Access |
| :--- | :--- | :--- |
| **Docker Hub** | `vndangkhoa/kv-file-pro:latest` | Standard Hub Image |
| **GitHub Container Registry (GHCR)** | `ghcr.io/vndangkhoa/kv-file-pro:latest` | Private Registry |
| **Forgejo (Primary Mirror)** | `git.khoavo.vndns.net/vndangkhoa/kv-file-pro:latest` | Private Mirror |
| **Forgejo (Secondary Mirror)** | `git.khoavo.myds.me/vndangkhoa/kv-file-pro:latest` | Private Mirror |

---

## ⌨️ Keyboard Shortcuts

Speed up your daily workflow with native hotkeys:

| Key | Scope | Action |
| :--- | :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>K</kbd> / <kbd>⌘</kbd> + <kbd>K</kbd> | Global | Open Command Palette & Quick Search |
| <kbd>Space</kbd> | Selection | Quick Look file preview (macOS style) |
| <kbd>Enter</kbd> | Selection | Open folder / launch default file viewer |
| <kbd>↑</kbd> / <kbd>↓</kbd> / <kbd>←</kbd> / <kbd>→</kbd> | Miller Columns | Navigate cascading columns & files |
| <kbd>Alt</kbd> + <kbd>S</kbd> | Global | Toggle Dual-Pane Split View |
| <kbd>F2</kbd> | Selection | Inline file/folder rename |
| <kbd>F5</kbd> | Split View | Copy selected items to target pane |
| <kbd>F6</kbd> | Split View | Move selected items to target pane |
| <kbd>Delete</kbd> | Selection | Move item to Recycle Bin |
| <kbd>Shift</kbd> + <kbd>Delete</kbd> | Selection | Permanently delete item |
| <kbd>Ctrl</kbd> + <kbd>L</kbd> | Navigation | Focus & edit address bar path directly |
| <kbd>Esc</kbd> | Modals | Close previewer, search, or dialogs |

---

## ⚙️ Environment Variables & Configuration

Configure KV Files via environment variables or command-line flags:

| Flag | Environment Variable | Default | Purpose |
| :--- | :--- | :--- | :--- |
| `-H, --host` | `KV_HOST` | `0.0.0.0` | Network interface to bind |
| `-p, --port` | `KV_PORT` | `8866` | TCP listening port |
| `--data-dir` | `KV_DATA_DIR` | `./data` | Directory for persistent SQLite DB and sessions |
| `--storage-roots` | `KV_STORAGE_ROOTS` | `./storage` | Named mounts (`photos:/mnt/photos:docs:/mnt/docs`) |
| `--license-key` | `KV_LICENSE_KEY` | None | Offline Ed25519 Pro License Key (`KVPRO-...`) |
| — | `RUST_LOG` | `kv_files=info` | Tracing filter (`error`, `warn`, `info`, `debug`) |

---

## ⚡ KV Files PRO — Enterprise & Commercial Edition

**KV Files PRO** extends KV Files with high-performance studio viewports and cryptographic license security:

* **Universal CAD & BIM Viewport**: Native 3D WebGL renderer for AutoCAD (`.dwg`, `.dxf`), Industry Foundation Classes (`.ifc`), and solid models (`.step`, `.stp`, `.iges`, `.stl`, `.obj`). Includes 3D Sectioning, Exploded Assemblies, and ViewCube orientation.
* **Adobe Creative Suite Studio**: In-browser layer and vector parser for Photoshop (`.psd`, `.psb`), Illustrator (`.ai`, `.eps`), InDesign (`.indd`, `.idml`), and Adobe XD.
* **Typography Specimen Studio**: Dynamic waterfall scales and Unicode glyph maps for `.ttf`, `.otf`, `.woff`, and `.woff2`.
* **SysVis Architecture & Flow Animator**: Real-time SVG flow pulses, dagre layout, and Mermaid engine.
* **Asymmetric Ed25519 Cryptographic Licensing**: Licenses are digitally signed using Ed25519 private keys and verified offline with the embedded master public key. Customer instances never require network phone-home or online DRM check-ins.

### Issue & Verify Licenses via CLI

```bash
# Issue a lifetime license for a customer
./launch.sh keygen issue --user "acme-corp" --email "team@acme.com" --lifetime

# Verify an existing license key
./launch.sh keygen verify "KVPRO-..."
```

---

## 🛠️ Native Source Build & Management

### Automated Build & Launch with Script (Fastest)

```bash
# Build KV Files PRO (default)
./launch.sh build --pro

# Build Community Edition (core only)
./launch.sh build --community

# Start background daemon
./launch.sh start
```

### Manual Compilation

To compile manually without the launch script:

```bash
# 1. Clone repository
git clone https://github.com/vndangkhoa/kv-file-pro.git && cd kv-file-pro

# 2. Build Web Frontend & Hugo Documentation
cd web && npm install && npm run build:pro && cd ..

# 3. Compile optimized Rust binary
cargo build --release

# 4. Run directly
./target/release/kv-files --port 8866 --storage-roots ./storage
```

---

## 📡 Documentation & API

KV Files PRO includes an embedded documentation portal and a comprehensive REST/WebSocket API under `/api/v1`.

- 🚀 **[Getting Started & Installation Guide](https://vndangkhoa.github.io/kv-file/docs/getting-started/)**
- 🛡️ **[Reverse Proxy Setup (Nginx, Caddy, Traefik)](https://vndangkhoa.github.io/kv-file/docs/getting-started/reverse-proxy/)**
- 🔧 **[Storage Roots & Security Hardening](https://vndangkhoa.github.io/kv-file/docs/configuration/)**
- 📡 **[Full REST API & WebSocket Feed Specifications](https://vndangkhoa.github.io/kv-file/docs/api/)**

---

## 🌟 Support & Commercial Inquiries

If you find KV Files PRO valuable:

- **Star this repository** on GitHub to support active development ⭐
- Share your setup on [Reddit r/selfhosted](https://reddit.com/r/selfhosted) or tech forums
- File bug reports or submit feature suggestions via [GitHub Issues](https://github.com/vndangkhoa/kv-file-pro/issues)
- Inquire about Enterprise volume licensing and custom branding extensions

---

## 📄 License

Distributed under the **KV Files PRO Commercial & Enterprise License**. See [`LICENSE`](LICENSE) for complete details.

Developed with ❤️ by **Khoa Vo ([@vndangkhoa](https://github.com/vndangkhoa))**.
