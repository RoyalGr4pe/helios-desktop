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

## Install From A Published AppImage

Publish the AppImage from `release/`, then users can install with:

```bash
curl -fsSL https://example.com/install.sh | bash -s -- https://example.com/helios-desktop-1.0.0.AppImage
```

Or with an environment variable:

```bash
curl -fsSL https://example.com/install.sh | HELIOS_DOWNLOAD_URL=https://example.com/helios-desktop-1.0.0.AppImage bash
```

Disable autostart during install:

```bash
scripts/install.sh --no-autostart
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
