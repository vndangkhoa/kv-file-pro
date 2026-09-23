# Changelog

All notable changes to **KV Files (`kv-file`)** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.1.0] - 2026-09-21

### 🚀 Major Feature Release: KV Files PRO Commercial Suite, Official ZaloPay Production & Synology SPK
Version 2.1.0 marks the official public release of **KV Files PRO**, bringing an enterprise-grade commercial extension ecosystem, offline asymmetric Ed25519 cryptographic licensing, official approved ZaloPay Production Payment Gateway & VietQR, official Synology DSM 7.x Package Center integration, multi-registry Docker distribution, and universal viewports for engineering, design, and development assets.

### Added
- **Official ZaloPay Production Payment Gateway & VietQR**:
  - Live production activation with approved Merchant App ID `210841`, Store ID `835219_835220_835221`, and partner BVBank virtual account (`99ZP26264M77756812`).
  - Dual-key HMAC-SHA256 cryptography (Key1 for order generation & query, Key2 for IPN webhook callbacks).
  - Streamlined, privacy-focused checkout modal ([ZaloPayPaymentModal.tsx](file:///mnt/data/Projects/kv-file_PRO/web/src/components/modals/settings/ZaloPayPaymentModal.tsx)) with clean QR matrix centerpiece, zero address exposure, quick-copy transfer details, and admin one-click verification.
  - Multi-banking compatibility supporting ZaloPay app and 40+ Vietnamese banking apps via VietQR / Napas247 standard.
- **Synology DSM 7.x Package Center (SPK) Distribution**:
  - Published and activated official Synology SPK package `kv-file-pro` at [`https://syno.vndns.net/package/kv-file-pro`](https://syno.vndns.net/package/kv-file-pro).
  - Automated installation with random free port discovery, DSM desktop application launcher icon, and automatic shared storage detection across `/volume1` through `/volume5`.
- **Multi-Registry Public Container Distribution**:
  - Automated multi-registry builds pushing `latest` and `2.1.0` tags to:
    - **Docker Hub**: `vndangkhoa/kv-file-pro`
    - **GitHub Packages (GHCR)**: `ghcr.io/vndangkhoa/kv-file-pro`
    - **Forgejo Instance 1**: `git.khoavo.vndns.net/vndangkhoa/kv-file-pro`
    - **Forgejo Instance 2**: `git.khoavo.myds.me/vndangkhoa/kv-file-pro`
- **Asymmetric Ed25519 Cryptographic Licensing Engine**:
  - Offline digital signature licensing architecture built with `ed25519-dalek` ([licensing.rs](file:///mnt/data/Projects/kv-file_PRO/src/licensing.rs)).
  - Hardcoded master public key verification ensuring 100% offline license validation without external telemetry or DRM phone-home calls.
  - CLI key generator and license verification tool ([launch.sh keygen](file:///mnt/data/Projects/kv-file_PRO/launch.sh), [keygen.py](file:///mnt/data/Projects/kv-file_PRO/scripts/keygen.py)).
  - Dual-layer licensing model: user account binding with automatic server-level promotion for private host deployments (`data/license.key`).
- **Universal CAD & BIM Studio Viewport**:
  - WebGL 3D CAD/BIM engine supporting AutoCAD (`.dwg`, `.dxf`), IFC BIM structures, and solid 3D models (`.step`, `.stp`, `.iges`, `.stl`, `.obj`).
  - WebAssembly-powered DWG parser integration via `@mlightcad/libredwg-web` with embedded `libredwg-web.wasm`.
  - Professional inspection features: interactive X/Y/Z clipping section planes, exploded assembly view slider, and ViewCube 3D orientation navigation.
- **Adobe Creative Suite Studio**:
  - Native in-browser layer and vector parser for Adobe Photoshop (`.psd`, `.psb`) using `ag-psd`.
  - Vector and layout preview support for Adobe Illustrator (`.ai`, `.eps`), InDesign (`.indd`, `.idml`), and Adobe XD.
- **Typography Specimen Studio**:
  - Dynamic waterfall font preview scales, custom sample text inputs, and Unicode glyph maps for `.ttf`, `.otf`, `.woff`, and `.woff2`.
- **SysVis Architecture & Flow Animator**:
  - Dynamic system workflow visualization powered by Mermaid engine and dagre layout with real-time SVG animated flow pulses.
- **In-App Extensions Ecosystem & Catalog**:
  - Modular extensions store and manager ([ExtensionsTab.tsx](file:///mnt/data/Projects/kv-file_PRO/web/src/components/modals/settings/ExtensionsTab.tsx), [useExtensionStore.ts](file:///mnt/data/Projects/kv-file_PRO/web/src/stores/useExtensionStore.ts)).
  - Pluggable file format preview host ([ExtensionPreviewHost.tsx](file:///mnt/data/Projects/kv-file_PRO/web/src/components/preview/ExtensionPreviewHost.tsx)).
- **Unified Production CLI & Service Daemon (`launch.sh`)**:
  - Single executable script providing `start`, `stop`, `restart`, `status`, `logs`, `build`, `keygen`, and health checks.

### Changed
- Refactored ZaloPay checkout UI to remove merchant physical address strings and simplify scan experience.
- Updated service worker caches to `v3` preventing fetch promise exceptions.
- Embedded complete Hugo documentation into frontend build artifacts.

---

## [2.0.0] - 2026-09-14

### 🚀 Major Milestone Release
Version 2.0.0 represents a complete architectural overhaul and major feature expansion, transforming KV Files into a full Progressive Web App (PWA) with native mobile media playcard integration, enterprise-grade two-factor authentication, universal Apple ecosystem support, and automated container deployment across multiple registries.

### Added
- **Progressive Web App (PWA) & Mobile Installation**:
  - Added [manifest.webmanifest](file:///mnt/data/Projects/kv-file/web/public/manifest.webmanifest) and `manifest.json` configured for standalone installation on Android, iOS, ChromeOS, Windows, and macOS.
  - Added dedicated Service Worker (`sw.js`) providing instant offline shell caching and background asset management.
  - Complete suite of vector SVG and raster PNG application icons ranging from 16px to 512px, including Android adaptive maskable icons and Apple Touch Icon (180x180).
  - Configured mobile-optimized viewport tags, `viewport-fit=cover`, safe-area-inset padding, and dynamic status-bar styling for dark and light modes.

- **System Media Playcard (W3C Media Session API)**:
  - Integrated native lockscreen and notification control center media playcards into both [AudioPlayerModal.tsx](file:///mnt/data/Projects/kv-file/web/src/components/preview/AudioPlayerModal.tsx) and [VideoPlayerModal.tsx](file:///mnt/data/Projects/kv-file/web/src/components/preview/VideoPlayerModal.tsx).
  - Dynamic Island and Control Center on iOS, and Quick Settings Media Notification on Android now display live track title, album artwork, and artist metadata.
  - Interactive playback action handlers supporting Play, Pause, Seek Backward (-10s), Seek Forward (+10s), Scrub Seek Timeline, and Stop.
  - Live timeline synchronization via `navigator.mediaSession.setPositionState`.

- **Comprehensive Apple & iOS Format Ecosystem**:
  - Added full playback and preview support for native iPhone and macOS video/audio: QuickTime `.mov`, Apple Lossless / MPEG-4 `.m4a`, and Core Audio Format `.caf`.
  - Added high-resolution image preview and thumbnail generation for Apple High Efficiency formats: `.heic` and `.heif`.
  - Added document preview integration for Apple iWork suite: `.pages`, `.numbers`, and `.keynote`.

- **Two-Factor Authentication (2FA / TOTP)**:
  - Added RFC 6238 Time-Based One-Time Password (TOTP) two-factor authentication.
  - Backend TOTP generation and QR code embedding using the `totp-rs` library.
  - Added [TwoFactorSetupModal.tsx](file:///mnt/data/Projects/kv-file/web/src/components/modals/TwoFactorSetupModal.tsx) with interactive 6-digit verification code inputs and emergency recovery instructions.
  - Hardened authentication flow supporting multi-step `pre_auth_token` login verification.

- **Public Share Landing Page & Interactive Preview / Download Portal**:
  - Added [PublicSharePage.tsx](file:///mnt/data/Projects/kv-file/web/src/components/public/PublicSharePage.tsx) standalone public landing page for share links at `/share/{token}` and `/s/{token}`.
  - Interactive in-browser live preview for code and text files (YAML, Docker Compose, JSON, Markdown, Python, Shell scripts, Configs) with syntax styling, line numbers, and copy-content action.
  - In-browser media playback for images, HTML5 video/audio, and embedded PDF documents.
  - 1-Click direct file download and on-the-fly zip archive folder download.
  - Password protection unlock screen for password-secured shared links.
  - Automatic HTTP 307 temporary redirect from backend `/api/v1/public/share/{token}` to `/share/{token}` when accessed from a web browser.
  - Added dedicated `/api/v1/public/share/{token}/raw` endpoint for inline streaming.

- **Server & NAS Intelligent Folder Badges & Beginner Navigation**:
  - Automatically identifies and annotates folders across **Synology DSM** (`volume1`, `@appstore`, `docker`, `photos`, etc.), **TrueNAS CORE/SCALE** (`ix-applications`, `tank`, `pool`), **Unraid** (`user`, `appdata`, `domains`), and **Linux VPS / Docker** (`/opt/dockhand/stacks`).
  - Added **Simple Mode ("Hide OS Internals")** toggle in Detailed List and Miller Columns views to filter out 15+ low-level Linux system plumbing directories (`bin`, `boot`, `proc`, `sys`, `lib`, etc.) for beginners.
  - Added **Server Places & 1-Click Shortcuts** in the sidebar for Docker Stacks, System Configuration (`/etc`), System Logs (`/var/log`), Root User Home (`/root`), and Personal Storage.

- **Host Root Filesystem & Multi-Drive Mounts**:
  - Supported mounting host root filesystem (`root`), dedicated storage volume (`storage`), and docker stacks drive (`stacks`).

- **File Operations & Transfer Enhancements**:
  - **External Drag-and-Drop Overlay**: Fullscreen drop zone overlay when dragging files from desktop OS into the browser.
  - **Floating Upload Status Pill**: Animated non-blocking progress pill with percentage indicator, active file counter, and dismiss control.
  - **On-the-Fly Folder Zip Downloads**: High-performance zip streaming of entire directories without creating intermediate temporary files on disk.
  - **Universal Right-Click Context Menus**: Context menus across all tree items, breadcrumbs, search results, and empty canvas backgrounds.
  - **Recycle Bin Management**: Safe soft-deletion to `.trash` with 1-click restore to original directories and permanent purge.
  - **Advanced File Sharing**: Public share links with configurable expiration timestamps and password protection.

- **Mobile Navigation & Thumb-Zone Controls**:
  - Added [MobileFloatingActionButton.tsx](file:///mnt/data/Projects/kv-file/web/src/components/common/MobileFloatingActionButton.tsx) providing quick-access thumb-zone buttons for Upload, New Folder, and Search on mobile screens.
  - Touch swipe snapping on Miller Columns (`snap-x snap-mandatory` with `82vw` per column).
  - Off-canvas slide-over drawer navigation triggered from mobile hamburger button.

- **Multi-Platform Container Infrastructure**:
  - Added production multi-stage [Dockerfile](file:///mnt/data/Projects/kv-file/Dockerfile) and [docker-compose.yml](file:///mnt/data/Projects/kv-file/docker-compose.yml) based on minimal Debian Bookworm Slim with curl healthcheck integration.
  - Automated deployment and publishing across 4 container registries:
    - Docker Hub (`vndangkhoa/kv-file`)
    - GitHub Packages (`ghcr.io/vndangkhoa/kv-file`)
    - Forgejo Primary (`git.khoavo.vndns.net/vndangkhoa/kv-file`)
    - Forgejo Secondary (`git.khoavo.myds.me/vndangkhoa/kv-file`)

- **Documentation & Landing Experience**:
  - Built-in comprehensive documentation website powered by Lotus Docs embedded directly into the release binary at `/docs/`.
  - Added responsive promotional landing page at `/landing`.

### Changed
- **Default Data Source Switched to Live Backend**:
  - Switched the default active data source in [api.ts](file:///mnt/data/Projects/kv-file/web/src/services/api.ts) to the real Rust backend API (`apiDataSource`), providing immediate live disk synchronization.
  - Preserved optional mock data mode for rapid UI testing and demonstrations.
- **Unified Branding**:
  - Standardized branding across all interfaces, titles, logos, documentation, and fallback pages to **`kv-file` (KV Files)**.
- **Improved Explorer Navigation**:
  - Enhanced Miller Columns with smooth scroll snapping, active column indicators, and responsive terminal inspector pane.
  - Added 1-click instant playback for audio and video files across detailed list, grid, and search result views.

### Fixed
- **Two-Factor Authentication RFC 3548 Base32 Secret Parsing**:
  - Resolved `ParseBase32` error when scanning QR codes into Google Authenticator or Apple Passwords by generating canonical RFC 3548 Base32 secrets while preserving backwards compatibility with hexadecimal secrets.
- **Zero-Flicker inotify File Watching**:
  - Resolved automatic view reset and UI flickering caused by SQLite WAL / SHM and temp log writes (`-wal`, `-shm`, `beszel_data`).
  - WebSocket event handlers now retain user's active file selection, expanded tree branches, open columns, and active modal previewers without interruption.
- **Public Share Direct Link Resolution**:
  - Fixed public share URLs resolving to raw JSON in browsers by introducing dedicated frontend routes (`/share/{token}`) and automatic HTTP 307 browser redirection.

### Security
- Passwords hashed using Argon2id with random unique salts.
- Strict sandbox filesystem path validation using `dunce::canonicalize` to eliminate path traversal (`../`) attacks.
- Pre-auth token protection during two-factor authentication handshakes.

---

## [1.0.0] - 2026-08-01

### Added
- Initial release of KV Files file manager.
- Rust backend built on Axum and Tokio with embedded SQLite WAL database.
- Basic Windows Explorer detailed list view and macOS Miller Columns view.
- Basic file operations: directory browsing, file downloading, folder creation, and renaming.
- In-memory mock data source for initial frontend demonstration.
