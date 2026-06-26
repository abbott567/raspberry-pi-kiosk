#!/bin/bash
# Reconnects Wi-Fi if the internet drops out.
#
# Raspberry Pi OS manages networking with NetworkManager, so we use nmcli. 
# If the reconnect fails X times in a row, the Pi is rebooted as a last resort.
#
# Install commands: 
# sudo nano /usr/local/bin/check-wifi.sh
# sudo chmod 755 /usr/local/bin/check-wifi.sh

# Detect the active Wi-Fi interface
IFACE="$(nmcli -t -f DEVICE,TYPE device | awk -F: '$2=="wifi"{print $1; exit}')"
IFACE="${IFACE:-wlan0}"

# Shared config, also loaded by the kiosk server via systemd's EnvironmentFile so
# the watchdog and the page can't drift apart on what "online" means or how many
# failures trigger a reboot. See kiosk.conf.
CONFIG_FILE="${KIOSK_CONFIG:-/etc/kiosk.conf}"
# shellcheck source=/dev/null
[ -r "${CONFIG_FILE}" ] && . "${CONFIG_FILE}"

# Counter of consecutive failures, persisted between cron runs in /tmp so is wiped 
# on reboot. The test MUST match server.js's HEALTH_URL: otherwise the page can 
# show its offline overlay  because the server's HTTPS check failed whilst this
# wacher still sees the link as up, keeping the page's counter at 0.
FAIL_FILE="${FAIL_FILE:-/tmp/check-wifi-failures}"
MAX_FAILURES="${MAX_FAILURES:-5}"
HEALTH_URL="${HEALTH_URL:-https://www.google.com/generate_204}"

# Check the connection and the response
if curl -fsS -m 5 -o /dev/null "${HEALTH_URL}" > /dev/null 2>&1; then
  # Online: clear any recorded failures and exit
  rm -f "${FAIL_FILE}"
  exit 0
fi

# Offline: try to reconnect using nmcli
echo "No network connection, restarting ${IFACE}"
nmcli device disconnect "${IFACE}"
sleep 5
nmcli device connect "${IFACE}"

# Record the failure and increase the counter
failures=$(cat "${FAIL_FILE}" 2>/dev/null || echo 0)
failures=$((failures + 1))
echo "${failures}" > "${FAIL_FILE}"

# If the reconnect has failed too many times in a row, reboot the Pi
if [ "${failures}" -ge "${MAX_FAILURES}" ]; then
  echo "Reconnect failed ${failures} times, rebooting"
  rm -f "${FAIL_FILE}"
  /sbin/shutdown -r now
fi
