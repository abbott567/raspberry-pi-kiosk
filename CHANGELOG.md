# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project aims to adhere to [Semantic Versioning](https://semver.org/).

However, I am terrible at it, so please forgive me if it's not perfect.

## [2.0.0] Major Update

First update since 2017. 

A complete set of updated scripts and config for booting a Raspberry Pi 4/5 straight into a full-screen Chromium kiosk on Raspberry Pi OS with Node 24 LTS.

### Added
- `kiosk.sh` launcher that starts Chromium in kiosk mode using `labwc`,
  with `--password-store=basic` so the GNOME keyring never prompts on boot
- Zero-dependency demo Node server in `demo/` with a full-screen clock on port `3000` with an offline overlay, as a ready-to-run kiosk page
- `display.sh` to turn the display on and off via `wlr-randr`, with example
  `crontab` lines for blanking the screen on a schedule, for example, overnight
- Shared `/etc/kiosk.conf`, read by both `check-wifi.sh` and the demo server via systemd `EnvironmentFile`, so the server retries and the page's offline overlay stay in sync

### Updated
- `autostart` wired up the `kiosk.sh` script to `labwc`'s autostart
- `README.md` updated all guidance and:
   - Added guidance for headless setup over SSH
   - Added `raspi-config` commands for auto-login, timezone, and display backend
   - Added CSS/JS instructions for hiding the mouse pointer
- `node-server.service` updated `systemd` unit running the app as the unprivileged `pi` user
- `check-wifi.sh` auto-reconnect that pings every minute and auto-restarts Wi-Fi via `nmcli` NetworkManager if it goes down
- `config.txt` updated legacy settings for fixed-resolution HDMI screens
- `LICENSE` (MIT) and `.gitignore`.
