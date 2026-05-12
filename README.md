# Helios Desktop

A transparent Linux desktop widget dashboard for clock, weather, calendar, tasks, and agent tasks.

## Install From Source

Build and install for the current user:

```bash
npm install
npm run install:linux
```

This installs Helios to `~/.local/share/helios-desktop`, creates a `helios-desktop` command in `~/.local/bin`, adds a desktop launcher, and enables autostart on login.

Run manually:

```bash
helios-desktop
```

Uninstall:

```bash
npm run uninstall:linux
```

## Install From GitHub Release

Download and install the latest AppImage directly from GitHub:

```bash
curl -fsSL https://raw.githubusercontent.com/RoyalGr4pe/helios-desktop/main/scripts/install.sh | bash -s -- --launch https://github.com/RoyalGr4pe/helios-desktop/releases/latest/download/helios-desktop-1.0.0.AppImage
```

Disable autostart during install:

```bash
curl -fsSL https://raw.githubusercontent.com/RoyalGr4pe/helios-desktop/main/scripts/install.sh | bash -s -- --launch --no-autostart https://github.com/RoyalGr4pe/helios-desktop/releases/latest/download/helios-desktop-1.0.0.AppImage
```

## Package For Release

```bash
npm run package:linux
```

The AppImage is written to `release/` as `helios-desktop-<version>.AppImage`.

## Agent Tasks

Helios starts the local Agent Tasks API automatically on port `3847`. Agents can check:

```bash
curl -fsS http://localhost:3847/health
```
