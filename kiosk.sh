#!/bin/bash
# Launch Chromium full-screen as a kiosk on Raspberry Pi OS Bookworm (Wayland).
# Referenced from your compositor autostart (see the autostart file).
# Make executable: chmod +x kiosk.sh
#
# Change the URL below to your local server (e.g. http://localhost:3000) or any
# public website. The browser binary is "chromium" on Bookworm.
#
#   --kiosk          full screen, no window frame
#   --incognito      don't remember sessions, so an unclean power-off won't
#                    trigger a "restore pages?" prompt on next boot
#   --noerrdialogs / --disable-infobars / --disable-session-crashed-bubble
#                    suppress browser chrome and warning popups
#   --check-for-update-interval  effectively disable update nags
#   --password-store=basic       don't use the GNOME keyring, which otherwise
#                    pops up a "choose a password for the new keyring" prompt on
#                    first boot (and an unlock prompt on every boot after that)

URL="http://localhost:3000"

# Wait for the local Node server to come up before launching Chromium. The
# browser autostarts in parallel with node-server.service and does NOT retry a
# failed page load, so if it reaches localhost before the server is listening it
# gets stuck on Chromium's own "site can't be reached" page instead of our page. 
# Poll the port until it answers, then launch. Give up after ~60s and launch anyway.
for _ in $(seq 1 60); do
  if curl -s -o /dev/null "$URL"; then
    break
  fi
  sleep 1
done

# Chromium flags
exec chromium \
  --kiosk \
  --incognito \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --check-for-update-interval=31536000 \
  --password-store=basic \
  --ozone-platform=wayland \
  "$URL"
