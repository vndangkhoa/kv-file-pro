---
title: "KV FILE PRO Studios & Licensing"
description: "Professional CAD/BIM 3D Viewports, Adobe Creative Suite Studios, Typography & Flow Animators, and Offline Cryptographic Licensing"
icon: "military_tech"
weight: 205
toc: true
---

**KV FILE PRO** is the commercial and enterprise tier of kv-file, engineered specifically for design agencies, architecture and engineering firms, media production studios, and privacy-first enterprise self-hosters.

All PRO extensions execute with **zero server CPU overhead**: files are streamed directly into client-side WebAssembly, WebGL, and browser canvas engines.

---

## ⚡ PRO Studio Suite Overview

### 1. Universal CAD, BIM & 3D Studio
Native browser viewport for CAD blueprints, BIM building models, parametric solids, and 3D print meshes:

- **Supported Formats**: AutoCAD (`.dwg`, `.dxf`), Industry Foundation Classes (`.ifc`), Parametric Solids (`.step`, `.stp`, `.iges`, `.igs`, `.brep`), and 3D Meshes (`.stl`, `.obj`, `.gltf`, `.glb`, `.3mf`, `.ply`, `.fbx`).
- **Interactive 3D Orbit & ViewCube**: Rotate, pan, zoom, and align quickly to Top, Bottom, Left, Right, Front, or Isometric angles.
- **Dynamic 3-Axis Sectioning**: Cut planes along X, Y, or Z axes to inspect interior mechanics and architectural cavities.
- **Exploded Assembly Slider**: Dynamically separate multi-part assemblies to see nested internal components.
- **BIM IFC Spatial Tree**: Deep element hierarchy and property sets inspector.

---

### 2. Adobe Creative Suite Studio
Inspect professional creative assets directly in the browser without Adobe Creative Cloud subscriptions:

- **Supported Formats**: Photoshop (`.psd`, `.psb`), Illustrator (`.ai`), PostScript (`.eps`), InDesign (`.indd`, `.indt`, `.idml`), Adobe XD (`.xd`), Premiere Pro (`.prproj`), After Effects (`.aep`, `.aepx`), and Digital Negative (`.dng`).
- **Photoshop Layers & Canvas**: View composite renders and toggle individual layer visibility.
- **Illustrator & PostScript**: Stream vector artboards and inspect encapsulated PostScript paths.
- **InDesign IDML Packages**: Read spread layouts, typography styles, and story copy.
- **Video Editing Telemetry**: Timeline sequences, markers, and audio stems for Premiere Pro; composition graphs for After Effects.

---

### 3. Typography & Font Specimen Studio
In-browser design studio for testing and inspecting typefaces:

- **Supported Formats**: TrueType (`.ttf`), OpenType (`.otf`), and Web Open Font (`.woff`, `.woff2`).
- **Waterfall Scale Tester**: Live rendering at 14px, 18px, 24px, 32px, 48px, and 64px.
- **Pangrams & Live Input**: Test multilingual phrases, numbers, and custom editable specimen text.
- **Unicode Glyph Maps**: Complete unicode table inspection with character codes and HTML entities.

---

### 4. SysVis Architecture & Flow Animator
Interactive systems architecture and animated diagram engine:

- **Supported Formats**: Mermaid (`.mmd`, `.mermaid`), flowchart models (`.flow`), architecture graphs (`.arch`, `.diag`).
- **Live SVG Pulse Animation**: Real-time `animateMotion` particle pulses flowing through data edges.
- **Dagre Auto-Layout**: Self-healing orthogonal hierarchy graphs.
- **In-Browser Syntax Compiler**: Edit or preview Mermaid diagram code with zero latency.

---

### 5. Code & Config Studio Pro
Full-featured developer workbench embedded right into QuickLook:

- **Supported Formats**: 25+ languages including TypeScript, JavaScript, Rust, Python, Go, SQL, Bash, YAML, TOML, JSON, Dockerfile, Terraform/HCL.
- **Prism.js Syntax Engine**: Synchronized gutter line numbers, keyword highlight.
- **Integrated Formatters**: One-click beautify for JSON, SQL, XML, HTML, and CSS.
- **In-File Search**: Real-time keyword search with jump-to-match highlights.

---

### 6. Vector Graphics & SVG Studio Pro
High-precision vector workspace:

- **Infinite Pan & Zoom**: 25% to 1000% scale with zero quality loss.
- **Palette Extraction**: Automatic hex color palette scanner with one-click copy.
- **Dual View**: Seamlessly toggle between rendered vector and Prism XML code view.
- **Gzip SVGZ**: Direct in-memory decompression of compressed SVGs.

---

## 🔐 Offline Ed25519 Cryptographic Licensing

KV FILE PRO is built on a **Zero-Telemetry, Offline-First** philosophy. Enterprise instances never phone-home, require internet access, or connect to DRM servers.

### How Licensing Works
1. **Asymmetric Cryptography**: License keys (`KVPRO-...`) are signed using an Ed25519 private key.
2. **Offline Verification**: The KV FILE PRO binary includes the master public key. It verifies the signature, licensee name, and validity timestamp completely offline in under 0.1ms.
3. **Environment or CLI Activation**: Set `KV_LICENSE_KEY=KVPRO-...` in your `.env` or pass `--license-key`:

```bash
# Verify a license key via CLI
./launch.sh keygen verify "KVPRO-..."

# Issue a lifetime license (admin CLI)
./launch.sh keygen issue --user "acme-corp" --email "team@acme.com" --lifetime
```

---

## 💳 Instant Activation via ZaloPay & MoMo

For individual professionals and teams, KV FILE PRO includes an embedded payment gateway modal supporting:
- **ZaloPay v2 Production Gateway**: Instant dynamic and static QR scan-to-pay.
- **MoMo QR Integration**: Fast mobile wallet checkout.
- **Instant Unlock**: Enter your transaction ID or license key in **Settings → Extensions → Redeem License** to unlock the full PRO bundle permanently.

---

## 🚀 Quick Deployment with KV FILE PRO

### Docker Run (Official Image)
```bash
docker run -d \
  --name kv-file-pro \
  -p 8866:8866 \
  -v /data/storage:/storage \
  -v /data/config:/data \
  -e KV_LICENSE_KEY="KVPRO-..." \
  ghcr.io/vndangkhoa/kv-file-pro:latest
```

### Synology DSM (SPK Package)
KV FILE PRO provides pre-built Synology SPK packages for DSM 7.x, installing directly via DSM Package Center with systemd privilege isolation and native NAS icon integration.
