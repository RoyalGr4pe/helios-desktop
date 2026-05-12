#!/usr/bin/env bash
set -euo pipefail

APP_ID="helios-desktop"
BIN_NAME="helios-desktop"
INSTALL_ROOT="${HELIOS_INSTALL_DIR:-${HOME}/.local/share/${APP_ID}}"
BIN_DIR="${HELIOS_BIN_DIR:-${HOME}/.local/bin}"
DATA_HOME="${XDG_DATA_HOME:-${HOME}/.local/share}"
CONFIG_HOME="${XDG_CONFIG_HOME:-${HOME}/.config}"
PURGE=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --purge)
      PURGE=1
      shift
      ;;
    --help|-h)
      printf '%s\n' "Usage: scripts/uninstall.sh [--purge]"
      exit 0
      ;;
    *)
      printf '%s\n' "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

rm -rf "$INSTALL_ROOT"
rm -f "${BIN_DIR}/${BIN_NAME}"
rm -f "${DATA_HOME}/applications/${APP_ID}.desktop"
rm -f "${CONFIG_HOME}/autostart/${APP_ID}.desktop"

if [ "$PURGE" -eq 1 ]; then
  rm -rf "${CONFIG_HOME}/Helios Desktop" "${CONFIG_HOME}/${APP_ID}"
fi

printf '%s\n' "Helios Desktop uninstalled."
if [ "$PURGE" -eq 0 ]; then
  printf '%s\n' "User data was kept. Run with --purge to remove app data too."
fi
