# Raspberry Pi — Kiosk Mode

A collection of scripts that can be used to quickly enable a raspberry pi to boot up as a stand alone kiosk. If you're wanting to run a local server, you will need to follow all of these steps. If you want to boot up and hit a public url, you can skip the Node install. The benefit of running your app locally is you can have a custom error screen if the internet connection drops out.

This guide uses Raspberry Pi OS Bookworm on a Raspberry Pi 4 or 5, with Node 24 LTS, which was LTS at the time of writing.

## What you'll need

- A Raspberry Pi 4 or 5
- A microSD card, 8GB or larger, and a way to write to it from your computer
- A display, I recommend the official Raspberry Pi 7" touchscreen as it works out of the box
- A power supply for your Pi
- A computer running Raspberry Pi Imager, to flash the SD card
- Optional: a keyboard and mouse, but you can do the whole setup over SSH instead

## Table of contents

1. [Flash the SD card with Raspberry Pi Imager](#step-1-flash-the-sd-card-with-raspberry-pi-imager)
2. [Headless setup over SSH](#step-2-headless-setup-over-ssh)
3. [Clone the repo to the Pi](#step-3-clone-the-repo-to-the-pi)
4. [Install Node](#step-4-install-node)
5. [Run your Node server on startup](#step-5-run-your-node-server-on-startup)
6. [Setting up kiosk mode](#step-6-setting-up-kiosk-mode)
7. [Display config](#step-7-display-config)
8. [Auto-reconnect Wi-Fi](#step-8-auto-reconnect-wi-fi)
9. [Turn the display on and off on a schedule](#step-9-turn-the-display-on-and-off-on-a-schedule)
10. [Reboot the Pi into the kiosk](#step-10-reboot-the-pi-into-the-kiosk)
11. [Create your kiosk interface](#step-11-create-your-kiosk-interface)

## Step 1. Flash the SD card with Raspberry Pi Imager

> [!NOTE]
> You can do everything in this guide without a keyboard or mouse attached to the Pi, only the display needs to be plugged in. If you want to do it this way, enable SSH and make sure the Pi has an internet connection. Either enable Wi-Fi and set it up when using the Raspberry Pi imager, or connect the Pi via ethernet.

Download Raspberry Pi Imager (<https://www.raspberrypi.com/software/>),
which formats the SD card, writes the image, and pre-configures Wi-Fi, SSH,
hostname, and locale in one step.

1. Insert your SD card and open Raspberry Pi Imager
2. Device: Choose your Pi model, for example, Raspberry Pi 5
3. OS: Choose Raspberry Pi OS (64-bit)
4. Storage: Choose your SD card
5. Hostname: Enter a hostname, or leave it as `pi`
6. Localisation: Choose your capital city, timezone, and keyboard layout
7. Username: Enter a username, or leave it as `pi`
8. Password: Enter and confirm a password
9. Wi-fi: If you want the Pi to auto-connect to WIFI
   1. SSID: Enter your network name
   2. Password: Enter and confirm your network password
10. SSH: If you want to set up the Pi using another device
   1. SSH: Enable
   2. Choose with password authentication
11. Raspberry Pi Connect: If you want to control your Pi over the internet
   1. Pi Connect: Enable
12. Write the image
13. Put the card in the Pi and boot it up

## Step 2: Headless setup over SSH

> [!NOTE]
> If you're using an attached mouse and keyboard, you can skip this step.

Open the terminal on a device connected to the same network, and run the following SSH command using the hostname you set in the imager.

```bash
ssh pi@raspberrypi.local
```

Once connected, run the following two commands to make sure the Pi and all of its packages are up to date.

```bash
sudo apt update
sudo apt full-upgrade -y
```

Next, configure the Pi to boot straight to the desktop and auto-login. Otherwise your kiosk will hit a login screen and ruin the whole experience.

```bash
sudo raspi-config nonint do_boot_behaviour B4
```

### Some potential steps if you hit quirks

#### Time issues

If you have any issue with the time being out of sync, you might want to also set the timezone in the config. I've had to do it on older Pi models, so I always just do it now, even though it's probably not necessary. Obviously you'd use the correct timezone for your location.

```bash
sudo raspi-config nonint do_change_timezone Europe/London
```

If you continue to have time issues, make sure the Pi is syncing over the internet. 

Check the sync status:

```bash
timedatectl
```

Look for the following in the output:

```
System clock synchronized: yes
NTP service: active
```

If it says `no` / `inactive` enable `system-stymesyncd` with the following commands:

```bash
sudo timedatectl set-ntp true
sudo systemctl enable --now systemd-timesyncd
```

Then force an immediate resync and check it's now working:

```bash
sudo systemctl restart systemd-timesyncd
timedatectl timesync-status
```

#### Display issues

You shouldn't need to touch the display backend. A Pi 4/5 Bookworm image boots `labwc` (Wayland) by default, which is what the kiosk steps below assume. So, again this should not be necessary, but if you hit display issues you can try setting it to W2 manually.

```bash
sudo raspi-config nonint do_wayland W2
```

Confirm what's set by checking the session. You should see something like:
`autologin-session=rpd-labwc  ->  labwc is active`

```bash
grep -v '^#' /etc/lightdm/lightdm.conf | grep -i session
```

## Step 3: Clone the repo to the Pi

Clone / download this repo onto the Pi, you can always delete it later but it just makes installing the scripts much easier. Make sure you put it at the following path: `/home/pi/raspberry-pi-kiosk`

The easiest way to do it is just to clone it with the following command:

```bash
git clone https://github.com/abbott567/raspberry-pi-kiosk.git /home/pi/raspberry-pi-kiosk
```

CD into the folder once it's cloned.

```bash
cd /home/pi/raspberry-pi-kiosk
```

## Step 4. Install Node

> [!NOTE]
> You can skip this step if you plan to just point the kiosk at a public URL.

Raspberry Pi OS ships an older Node. Install the current LTS from NodeSource.

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Verify it installed by checking the version.

```bash
node -v
```

## Step 5. Run your Node server on startup

> [!NOTE]
> You can skip this step if you plan to just point the kiosk at a public URL.

This repo ships a tiny, zero-dependency demo server in [`demo/`](demo/) so you have something to display to test it's working. 

The demo just renders a full-screen clock on `http://localhost:3000`. It's a way to verify everything is working, and can be a starting point for when you build your own kiosk app.

The server also exposes a tiny `/health` endpoint that the page polls to detect when the server or network drops out. This is the hook for the "custom error screen" mentioned at the top — poll `/health` from your own kiosk page and show whatever offline message you like when it stops responding.

Install the `systemd` service from this repo. It ships pointing at the demo above, and it runs as the unprivileged `pi` user, rather than `root`. It also restarts automatically if it crashes. If you changed any of these in your setup, then you'll need to edit the `node-server.service` file before running the following commands.

```bash
sudo cp /home/pi/raspberry-pi-kiosk/node-server.service /etc/systemd/system/node-server.service
sudo systemctl enable --now node-server
```

Check the server is running.

```bash
systemctl status node-server
curl http://localhost:3000
```

You should get back the HTML from the `index.html` page.

The service also reads `/etc/kiosk.conf` if it exists (via `EnvironmentFile`), sharing `HEALTH_URL`, `MAX_FAILURES`, `FAIL_FILE`, and `HEALTH_TIMEOUT` with the Wi-Fi watchdog from [Step 8](#step-8-auto-reconnect-wi-fi). It's optional — the server falls back to sensible defaults without it — so you can install it now or when you reach Step 8. If you add or change it later, run `sudo systemctl restart node-server` to pick it up.

### Loading your own node project

Clone it onto the Pi. Then, edit the service file to match. You'll need to update the `WorkingDirectory`, `ExecStart`, and the `port`

Edit the file using nano.

```bash
sudo nano /etc/systemd/system/node-server.service
```

Then reload the server.

```bash
sudo systemctl daemon-reload && sudo systemctl restart node-server
```

## Step 6. Setting up kiosk mode

A Pi 4/5 Bookworm image boots the `labwc` compositor by default, which is what we target with the following two files:

- [`kiosk.sh`](kiosk.sh) launches Chromium with the kiosk flags. For the demo it's already pointed at `http://localhost:3000`, if you want to point it at a different URL, edit it at the top of this file
- [`autostart`](autostart) tells the Pi where the `kiosk.sh` file is on login, if you move the file you'll need to update it here

Make the script executable and wire it into `labwc`'s autostart:

```bash
chmod +x /home/pi/raspberry-pi-kiosk/kiosk.sh
mkdir -p ~/.config/labwc
echo '/home/pi/raspberry-pi-kiosk/kiosk.sh &' >> ~/.config/labwc/autostart
```

Notes on `kiosk.sh`:
- `--incognito` stops the "restore pages?" Chromium prompt if the Pi isn't shut down properly
- `--password-store=basic` stops the "choose a password for the new keyring" GNOME prompt on the first boot

## Step 7. Display config

> [!NOTE]
> You can skip this step if you're using an official Raspberry Pi display.

**Official Raspberry Pi 7" touchscreen:** this is what I use, and is auto-detected on Bookworm. You don't need to touch `config.txt` at all if you use the official display. If you need to rotate it, use the desktop *Screen Configuration* tool.

**HDMI panels only:** if you're using a fixed-resolution HDMI screen that won't show at the right resolution, there are two ways to fix it. Bookworm uses the KMS display driver by default, and most `hdmi_*` options in `config.txt` are ignored under it, so try these in order:

Set the resolution from the desktop *Screen Configuration* tool, or add a mode line to `/boot/firmware/cmdline.txt`:

```bash
sudo nano /boot/firmware/cmdline.txt
```

Append the following to the existing single line, adjusted for your display:

`video=HDMI-A-1:800x480@60`

If that doesn't work, older HDMI panels may still respond to the `hdmi_*` settings in [`config.txt`](config.txt). These are often ignored under KMS, so only try this if you're out of options:

Copy and adjust the settings in [`config.txt`](config.txt) to `/boot/firmware/config.txt`, using nano:

```bash
sudo nano /boot/firmware/config.txt
```

## Step 8. Auto-reconnect Wi-Fi

Wi-Fi can be flaky on the Pi. The [`check-wifi.sh`](check-wifi.sh) script checks the internet every minute by requesting `HEALTH_URL`, and if it detects it's down, reconnects the Wi-Fi via `nmcli` (NetworkManager). If the reconnect fails 5 times in a row, the Pi reboots itself as a last resort.

The number of retries (`MAX_FAILURES`) and the URL it checks (`HEALTH_URL`) live in [`kiosk.conf`](kiosk.conf). The kiosk server reads the same file (see [Step 5](#step-5-run-your-node-server-on-startup)), so both use the same definition of "online" which keeps the offline overlay's `X/5` countdown in sync with the reboot logic. Use the same `HEALTH_URL` here as the server, or the page can show "offline" while the watchdog still thinks the link is up.

Install the shared config, then the `check-wifi.sh` script, and make the script executable:

```bash
sudo cp kiosk.conf /etc/kiosk.conf
sudo cp check-wifi.sh /usr/local/bin/check-wifi.sh
sudo chmod 755 /usr/local/bin/check-wifi.sh
```

Then add the cron job to make it run every minute. Run the following command:

```bash
crontab -e
```

Then paste in the line from the [`crontab`](crontab) file in this repo at the bottom:

`*/1 * * * * /usr/bin/sudo -H /usr/local/bin/check-wifi.sh > /dev/null 2>&1`

## Step 9. Turn the display on and off on a schedule

> [!NOTE]
> Optional. Skip this step if you want the display on all the time.

If your kiosk doesn't need to be on 24/7, you can blank the screen overnight and wake it back up in the morning. The [`display.sh`](display.sh) script turns the display off or on, and you schedule it with cron just like the Wi-Fi check.

Pi OS runs the `labwc` compositor, which is wlroots-based, so the script uses `wlr-randr` to power the output down and back up. This properly turns the panel off, rather than just showing a black page, so the backlight on the official touchscreen switches off too!

Install `wlr-randr` if it isn't already present:

```bash
sudo apt install -y wlr-randr
```

Install the `display.sh` script and make it executable:

```bash
sudo cp display.sh /usr/local/bin/display.sh
sudo chmod 755 /usr/local/bin/display.sh
```

You can test it straight away from an SSH session:

```bash
/usr/local/bin/display.sh off
/usr/local/bin/display.sh on
```

Then add the cron jobs. Run the following command:

```bash
crontab -e
```

Then paste in the two display lines from the [`crontab`](crontab) file in this repo at the bottom, adjusting the times to suit. The example turns the screen off at 23:59 and back on at 07:00:

```
59 23 * * * /usr/local/bin/display.sh off > /dev/null 2>&1
0 7 * * * /usr/local/bin/display.sh on  > /dev/null 2>&1
```

Notes:

- The cron job runs as the `pi` user, and the script points `wlr-randr` at that user's session (`/run/user/1000`). If you set up the Pi with a different username, edit the UID at the top of `display.sh` — run `id -u <user>` to find it.

- The script auto-detects the Wayland socket, it can be `wayland-0`, `wayland-1` etc, depending on the setup, so you shouldn't need to set it manually. It also skips the placeholder `NOOP` output that `wlroots` creates while the real display is off, so the screen wakes back up correctly.

## Step 10. Reboot the Pi into the kiosk

With everything set up, reboot and the Pi should come back up straight into
your kiosk:

```bash
sudo reboot
```

## Step 11. Create your kiosk interface

Now that it's all up and running, you can just build your interface in regular old HTML, CSS and JavaScript.

### Additional tips

You can hide the cursor using CSS.

To hide it completely, which is ideal for a touchscreen, use the following CSS:

```css
html, body { cursor: none; }
```

**Note**: CSS only hides the cursor *over your page*, and only once labwc has sent the browser a pointer event. On a touchscreen with no mouse, labwc still draws its own arrow in the centre of the screen at boot, before the first touch, and CSS can't clear that. To hide the compositor cursor too, let `swayidle` fire `labwc`'s built-in `HideCursor` keybind. 

Install the tools:

```bash
sudo apt install swayidle wtype
```

Then, and add this to `~/.config/labwc/autostart`, unless you're using this repo's auto-start, as it's already included: [autostart](autostart):

```bash
swayidle -w timeout 1 'wtype -M logo -M alt -k h -m alt -m logo' &
```

The cursor then disappears ~1s after boot and re-hides shortly after each touch.

Or, if you want to show it, but hide it after a few seconds of inactivity, use the following CSS and JavaScript:

```css
body.idle { cursor: none; }
```

```js
// 3 Seconds
const LIMIT = 3000;
let t;

const wake = () => {
  document.body.classList.remove('idle');
  clearTimeout(t);
  t = setTimeout(() => document.body.classList.add('idle'), LIMIT);
};

['mousemove', 'mousedown', 'touchstart', 'keydown'].forEach(e =>
  window.addEventListener(e, wake, { passive: true })
);

wake();
```

## License

[MIT](LICENSE)
