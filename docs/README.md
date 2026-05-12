# helios-desktop

A modern glassmorphism desktop dashboard for Linux.

helios-desktop is a customizable desktop companion designed for minimalist Linux setups. It combines a live digital clock, weather, calendar events, and tasks into a clean floating dashboard with a glass-style UI inspired by modern macOS and Windows interfaces.

---

# Vision

Most Linux desktop widget systems are either:

* overly complex
* visually outdated
* difficult to customize
* tightly coupled to desktop environments

helios-desktop aims to solve that by providing a modern, web-powered dashboard experience that:

* looks polished
* feels lightweight
* integrates with common productivity tools
* remains fully customizable

The goal is to create something closer to:

* Rainmeter
* Übersicht
* modern smart displays
* ambient productivity dashboards

while preserving Linux-native performance.

---

# Core Features

## Clock Widget

A large glass-style digital clock.

Features:

* 12h / 24h support
* timezone support
* animated transitions
* optional seconds display
* date display
* custom fonts

---

## Weather Widget

Live weather conditions and forecasts.

Features:

* current temperature
* weather condition icons
* forecast view
* hourly rain probability
* location auto-detection
* metric / imperial units

Planned providers:

* OpenWeather API
* WeatherAPI

---

## Calendar Widget

Google Calendar integration.

Features:

* upcoming events
* daily agenda
* week overview
* reminders
* multiple calendars
* color-coded events

Possible integrations:

* Google Calendar API
* CalDAV
* iCal feeds

---

## Tasks Widget

A lightweight task management panel.

Features:

* checklists
* priorities
* recurring tasks
* drag-and-drop ordering
* quick add
* keyboard shortcuts

Planned integrations:

* Todoist
* Notion
* Local markdown files
* JSON storage

---

# Design Philosophy

helios-desktop is designed around:

## Glassmorphism

* blurred translucent panels
* subtle gradients
* soft shadows
* floating UI elements
* smooth animations

## Minimalism

* clean typography
* low visual clutter
* ambient information density
* distraction-free layout

## Modularity

Every widget should be:

* detachable
* movable
* resizable
* independently configurable

---

# Technology Stack

## Frontend

* React
* TailwindCSS
* Framer Motion
* Zustand or Redux

## Desktop Runtime

Preferred:

* Tauri

Alternative:

* Electron

## APIs

* OpenWeather
* Google Calendar API
* Todoist API

---

# Planned Features

## Widgets

* Spotify now playing
* CPU / RAM monitor
* GitHub activity
* battery stats
* system metrics
* pomodoro timer
* notes widget

---

## Themes

* dark mode
* AMOLED mode
* neon cyberpunk themes
* custom accent colors
* custom blur levels

---

## Desktop Integration

* startup on boot
* always-on-desktop mode
* click-through mode
* transparency support
* multi-monitor support

---

# UI Inspiration

helios-desktop draws inspiration from:

* macOS widgets
* Windows 11 glass UI
* Rainmeter
* Arc Browser
* Notion Calendar
* Nothing OS
* modern smart displays

---

# Target Platform

Primary target:

* Linux desktop environments

Tested environments:

* GNOME
* KDE Plasma
* Zorin OS
* Fedora
* Ubuntu

---

# Development Goals

## Performance

* low memory usage
* GPU-accelerated rendering
* efficient animations
* minimal CPU overhead

## Customization

Users should be able to:

* create layouts
* install themes
* write custom widgets
* modify styles easily

## Simplicity

helios-desktop should be:

* easy to install
* easy to configure
* visually polished by default

---

# Example Layout

```text
┌──────────────────────┐
│       19:42          │
│    Monday, May 11    │
└──────────────────────┘

┌──────────────────────┐
│  ☁  12°C             │
│  Rain expected       │
└──────────────────────┘

┌──────────────────────┐
│  Calendar            │
│  • Team meeting      │
│  • Gym               │
└──────────────────────┘

┌──────────────────────┐
│  Tasks               │
│  □ Finish dashboard  │
│  □ Review designs    │
└──────────────────────┘
```

---

# Long-Term Vision

helios-desktop is intended to become a modern Linux desktop dashboard ecosystem with:

* custom widget plugins
* theme marketplace
* community layouts
* productivity integrations
* cross-platform support

The focus is not just utility, but creating a desktop environment that feels ambient, modern, and enjoyable to use.
