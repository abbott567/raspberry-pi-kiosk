#!/bin/bash
# Turns the display on or off. Handy for blanking the screen overnight and
# waking it back up in the morning. Uses cron, see the crontab file.
#
# Raspberry Pi OS runs the labwc compositor, which is wlroots-based, so we use 
# wlr-randr to toggle the output's power.
#
# Usage:
#   display.sh on
#   display.sh off
#
# Install commands:
# sudo cp display.sh /usr/local/bin/display.sh
# sudo chmod 755 /usr/local/bin/display.sh
#
# Install wlr-randr if it isn't already present:
# sudo apt install -y wlr-randr

# Cron runs with a bare environment and no knowledge of the Wayland session,
# so point it at the pi user's session. If you use a different user, change
# the UID below (run `id -u <user>` to find it; pi is normally 1000).
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/1000}"

# The compositor's socket can be wayland-0, wayland-1. depending on the
# setup, so auto-detect it rather than hardcoding.
if [ -z "${WAYLAND_DISPLAY}" ]; then
  WAYLAND_DISPLAY="$(basename "$(ls "${XDG_RUNTIME_DIR}"/wayland-* 2>/dev/null | grep -v '\.lock$' | head -n1)" 2>/dev/null)"
fi
export WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-wayland-0}"

# First argument is the action, on or off
ACTION="$1"

# Detect the connected output, for example, the official touchscreen or an HDMI screen.
# When the real output is off, wlroots adds a placeholder NOOP output, so we have 
# to skip anything named NOOP* and pick the first real connector.
OUTPUT="$(wlr-randr | awk '/^[^ ]/ && $1 !~ /^NOOP/ {print $1; exit}')"

# If nothing is found throw an error
if [ -z "${OUTPUT}" ]; then
  echo "No display output found"
  exit 1
fi

# Turn the display on or off
case "${ACTION}" in
  on)
    echo "Turning ${OUTPUT} on"
    wlr-randr --output "${OUTPUT}" --on
    ;;
  off)
    echo "Turning ${OUTPUT} off"
    wlr-randr --output "${OUTPUT}" --off
    ;;
  *)
    echo "Usage: $0 {on|off}"
    exit 1
    ;;
esac
