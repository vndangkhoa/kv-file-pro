---
title: "KV FILE PRO Documentation"
description: "Military-grade self-hosted web file manager, studio workspace & CAD/BIM viewport with macOS Miller Columns and Windows Explorer UI"
icon: "article"
toc: true
weight: 10
---

**KV FILE PRO** (`kv-file-pro` v2.1.0) is a military-grade, ultra-fast commercial and enterprise web file manager & studio workspace built with a **Rust (Axum + Tokio)** backend, embedded SQLite WAL, and a **React + Tailwind CSS** frontend. It seamlessly unites the familiar hierarchical directory tree of **Windows Explorer** with cascading **macOS Miller Columns**, integrated **3D CAD/BIM** viewports, **Adobe Creative Suite** studios, and **offline Ed25519 asymmetric licensing**.

{{< alert context="info" >}}
Looking for the interactive showcases, live demos, and deployment guides? Visit the **[KV FILE PRO Official Website →](https://vndangkhoa.github.io/kv-file-pro/?ref=docs_overview)**
{{< /alert >}}

KV FILE PRO delivers bare-metal performance while introducing next-generation capabilities: real-time Linux kernel filesystem watching (`inotify`), instant soft-delete trash restoration, zero-copy HTTP Range video seeking, 3D CAD sectioning, and an integrated Command Palette (`Ctrl+K`).

---

## 🧭 Documentation Map

<div class="row mt-4">
  <div class="col-md-4 mb-3">
    <div class="card p-3 h-100 border">
      <div class="d-flex align-items-center mb-2">
        <i class="material-icons text-primary me-2">rocket_launch</i>
        <h5 class="mb-0">Getting Started</h5>
      </div>
      <p class="text-muted small mb-3">Quickstart guide, source compilation, Docker setup, and production reverse proxy configurations (Nginx, Caddy, Traefik).</p>
      <a href="getting-started/" class="btn btn-sm btn-primary">Get Started &rarr;</a>
    </div>
  </div>
  <div class="col-md-4 mb-3">
    <div class="card p-3 h-100 border">
      <div class="d-flex align-items-center mb-2">
        <i class="material-icons text-primary me-2">diamond</i>
        <h5 class="mb-0">Core Features</h5>
      </div>
      <p class="text-muted small mb-3">macOS Miller Columns, Windows Explorer table, Spacebar Quick Look, Split View, Download Manager, 2FA, and Inotify sync.</p>
      <a href="features/" class="btn btn-sm btn-primary">Explore Features &rarr;</a>
    </div>
  </div>
  <div class="col-md-4 mb-3">
    <div class="card p-3 h-100 border">
      <div class="d-flex align-items-center mb-2">
        <i class="material-icons text-warning me-2">military_tech</i>
        <h5 class="mb-0">PRO Studios & License</h5>
      </div>
      <p class="text-muted small mb-3">CAD/BIM 3D Viewport (DWG/IFC/STEP), Adobe Studio (PSD/AI/XD), Typography, SysVis Animator, and Ed25519 offline licensing.</p>
      <a href="features/pro-extensions-and-licensing/" class="btn btn-sm btn-warning text-dark font-weight-bold">PRO Studios &rarr;</a>
    </div>
  </div>
  <div class="col-md-6 mb-3">
    <div class="card p-3 h-100 border">
      <div class="d-flex align-items-center mb-2">
        <i class="material-icons text-primary me-2">settings</i>
        <h5 class="mb-0">Configuration</h5>
      </div>
      <p class="text-muted small mb-3">Environment variables, multi-root storage mounts, SQLite WAL database, security hardening, and backups.</p>
      <a href="configuration/" class="btn btn-sm btn-primary">Configuration Guide &rarr;</a>
    </div>
  </div>
  <div class="col-md-6 mb-3">
    <div class="card p-3 h-100 border">
      <div class="d-flex align-items-center mb-2">
        <i class="material-icons text-primary me-2">terminal</i>
        <h5 class="mb-0">API Reference</h5>
      </div>
      <p class="text-muted small mb-3">Complete REST endpoints catalog with curl examples, request/response JSON schemas, and real-time WebSocket streams.</p>
      <a href="api/" class="btn btn-sm btn-primary">API Specs &rarr;</a>
    </div>
  </div>
</div>

---

## ⚡ Architectural Highlights

```
┌─────────────────────────────────────────────────────────────┐
│                    React + Tailwind SPA                     │
│  Zustand Store (useExplorerStore) • Lucide • Native Hotkeys  │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP REST & WebSockets (/api/v1)
┌──────────────────────────────▼──────────────────────────────┐
│                    Rust (Axum + Tokio)                      │
│   Inotify Watcher • Dunce Sandboxing • Argon2id • Range 206 │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                  Embedded SQLite (WAL Mode)                 │
│         Single 'kv.db' file: Users • Public Shares • Trash  │
└─────────────────────────────────────────────────────────────┘
```

1. **High-Throughput Asynchronous Backend**:
   Built on [Axum 0.8](https://github.com/tokio-rs/axum) and [Tokio](https://tokio.rs), kv-file handles concurrent file transfers, chunked uploads, and streaming downloads with minimal CPU and memory overhead.
2. **Zero-Polling Kernel File Watcher**:
   Hooks into Linux `inotify` via the Rust `notify` crate. Files created by CLI scripts, `rsync`, background downloaders, or Docker mounts update in the browser within milliseconds.
3. **Single-Binary Self-Hosting**:
   The compiled single-page web app (`web/dist`) is embedded directly into the Rust executable at compile time using `rust-embed`. Deploying kv-file requires copying just **one static binary** (`./kv-file`).
4. **Zero-Trust Sandboxing**:
   All filesystem queries are verified with `dunce::canonicalize` to prevent directory traversal (`../../etc/passwd`) and symbolic link escape attacks.
5. **Embedded SQLite Database with WAL**:
   User credentials, public share links, and trash bin metadata reside in an embedded SQLite database (`kv.db`) running in Write-Ahead Logging (WAL) mode for maximum concurrency.
