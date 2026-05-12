#!/usr/bin/env bash
set -euo pipefail

APP_NAME="Helios Desktop"
APP_ID="helios-desktop"
BIN_NAME="helios-desktop"

SOURCE="${HELIOS_DOWNLOAD_URL:-${1:-}}"
INSTALL_ROOT="${HELIOS_INSTALL_DIR:-${HOME}/.local/share/${APP_ID}}"
BIN_DIR="${HELIOS_BIN_DIR:-${HOME}/.local/bin}"
DATA_HOME="${XDG_DATA_HOME:-${HOME}/.local/share}"
CONFIG_HOME="${XDG_CONFIG_HOME:-${HOME}/.config}"
APPLICATIONS_DIR="${DATA_HOME}/applications"
AUTOSTART_DIR="${CONFIG_HOME}/autostart"
DESKTOP_FILE="${APPLICATIONS_DIR}/${APP_ID}.desktop"
AUTOSTART_FILE="${AUTOSTART_DIR}/${APP_ID}.desktop"
BIN_PATH="${BIN_DIR}/${BIN_NAME}"
NO_AUTOSTART=0

usage() {
  printf '%s\n' "Usage: scripts/install.sh [--no-autostart] [APPIMAGE_OR_URL_OR_UNPACKED_DIR]"
  printf '%s\n' ""
  printf '%s\n' "Examples:"
  printf '%s\n' "  scripts/install.sh"
  printf '%s\n' "  scripts/install.sh release/helios-desktop-1.0.0.AppImage"
  printf '%s\n' "  scripts/install.sh https://example.com/helios-desktop.AppImage"
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --help|-h)
      usage
      exit 0
      ;;
    --no-autostart)
      NO_AUTOSTART=1
      shift
      ;;
    *)
      SOURCE="$1"
      shift
      ;;
  esac
done

SCRIPT_SOURCE="${BASH_SOURCE[0]:-${0:-}}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_SOURCE")" 2>/dev/null && pwd)" || SCRIPT_DIR=""
PROJECT_ROOT="${HELIOS_PROJECT_ROOT:-${SCRIPT_DIR:-.}/..}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

download_file() {
  url="$1"
  output="$2"

  if command -v curl >/dev/null 2>&1; then
    curl -fL "$url" -o "$output"
    return
  fi

  if command -v wget >/dev/null 2>&1; then
    wget -O "$output" "$url"
    return
  fi

  printf '%s\n' "Install failed: curl or wget is required to download ${url}" >&2
  exit 1
}

find_local_appimage() {
  for file in "${PROJECT_ROOT}"/release/*.AppImage "${PROJECT_ROOT}"/release/helios-desktop-*; do
    if [ -f "$file" ]; then
      printf '%s\n' "$file"
      return 0
    fi
  done

  return 1
}

install_unpacked_dir() {
  source_dir="$1"
  app_dir="${INSTALL_ROOT}/app"

  rm -rf "$app_dir" "${INSTALL_ROOT}/helios-desktop.AppImage"
  mkdir -p "$app_dir"
  cp -a "${source_dir}/." "$app_dir/"
  chmod +x "${app_dir}/helios-desktop"

  cat > "$BIN_PATH" <<EOF
#!/usr/bin/env bash
export HELIOS_LAUNCH_COMMAND="${BIN_PATH}"
exec "${app_dir}/helios-desktop" --no-sandbox "\$@"
EOF
}

install_appimage() {
  source_file="$1"
  appimage_path="${INSTALL_ROOT}/helios-desktop.AppImage"

  rm -rf "${INSTALL_ROOT}/app"
  mkdir -p "$INSTALL_ROOT"
  cp "$source_file" "$appimage_path"
  chmod +x "$appimage_path"

  cat > "$BIN_PATH" <<'BINEOF'
#!/usr/bin/env bash
export HELIOS_LAUNCH_COMMAND="${BIN_PATH}"
DISPLAY_ARG=""
if [ -n "$HELIOS_DISPLAY" ]; then
  DISPLAY_ARG="--display=$HELIOS_DISPLAY"
fi
exec "${appimage_path}" --ozone-platform=x11 --no-sandbox $DISPLAY_ARG "$@"
BINEOF
}

mkdir -p "$INSTALL_ROOT" "$BIN_DIR" "$APPLICATIONS_DIR" "$AUTOSTART_DIR"

if [ -z "$SOURCE" ]; then
  if [ -x "${PROJECT_ROOT}/release/linux-unpacked/helios-desktop" ]; then
    SOURCE="${PROJECT_ROOT}/release/linux-unpacked"
  else
    SOURCE="$(find_local_appimage || true)"
  fi
fi

if [ -z "$SOURCE" ]; then
  printf '%s\n' "Install failed: no local build was found." >&2
  printf '%s\n' "Run npm run electron:build first, or pass an AppImage URL." >&2
  exit 1
fi

case "$SOURCE" in
  http://*|https://*)
    downloaded="${TMP_DIR}/helios-desktop.AppImage"
    printf '%s\n' "Downloading ${APP_NAME}..."
    download_file "$SOURCE" "$downloaded"
    install_appimage "$downloaded"
    ;;
  *)
    if [ -d "$SOURCE" ]; then
      if [ ! -x "${SOURCE}/helios-desktop" ]; then
        printf '%s\n' "Install failed: ${SOURCE} is not a linux-unpacked Helios build." >&2
        exit 1
      fi
      install_unpacked_dir "$SOURCE"
    elif [ -f "$SOURCE" ]; then
      install_appimage "$SOURCE"
    else
      printf '%s\n' "Install failed: source not found: ${SOURCE}" >&2
      exit 1
    fi
    ;;
esac

chmod +x "$BIN_PATH"

cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Type=Application
Name=${APP_NAME}
Comment=Desktop widgets for clock, weather, calendar and tasks
Exec=${BIN_PATH}
Terminal=false
Categories=Utility;
StartupNotify=false
StartupWMClass=${APP_NAME}
EOF

if [ "$NO_AUTOSTART" -eq 0 ]; then
  cp "$DESKTOP_FILE" "$AUTOSTART_FILE"
  printf '%s\n' "Autostart enabled."
else
  rm -f "$AUTOSTART_FILE"
  printf '%s\n' "Autostart disabled."
fi

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$APPLICATIONS_DIR" >/dev/null 2>&1 || true
fi

printf '%s\n' "${APP_NAME} installed."
printf '%s\n' "Run it with: ${BIN_PATH}"
printf '%s\n' "Desktop entry: ${DESKTOP_FILE}"
printf '%s\n' "Uninstall with: ${PROJECT_ROOT}/scripts/uninstall.sh"
