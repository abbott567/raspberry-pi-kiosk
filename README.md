# Raspberry Pi - Kiosk Mode

A collection of scripts that can be used to quickly enable a raspberry pi to boot up as a stand alone kiosk. If you're wanting to run a local server, you will need to follow all of these steps. If you want to boot up and hit a public url, you can skip the Node7 install. The benefit of running your app locally is you can have a custom error screen if the internet connection drops out.

To make this work I was using the January 2017 version of Raspian Jessie with Pixel and a Rasberry Pi 2.

## SD Formatter for Mac
To format an SD card using the FAT format you will need SDFormatter, as Disk Utility cannot do this by default.
https://www.sdcard.org/downloads/formatter_4/eula_mac/index.html

## Installing Rasbian
To install rasbian on your SD card, download the disk image from https://www.raspberrypi.org/downloads/raspbian/ and unzip it. It will contain a .img file, make a note of the path. If you don't know the path, you can find it by dragging the downloaded .img file into the terminal. This will show as something similar to ~/users/username/Downloads/rasbian.img. Replace [PATH_TO_.img] with your actual path in the next command.

You will also need to know the identifier for your SD card slot in your Mac. To find this, click the Apple icon in the top left, and choose 'About This Mac'. Then choose 'System Report'. Then choose 'Card Reader' from the sidebar. This will give you the identifier, such as 'disk2'. Replace [DSK] with your disk identifier in the next command.

Now, from your terminal type:
```
sudo dd bs=1m if=[PATH_TO_.img] of=/dev/[DSK]
```

This will install Rasbian to the SD card. This may take some time.

## Installing Node 7

By default, Rasbian ships with Node 0.10, this can be verified by typing `node -v` into the terminal. The next steps will remove this and install Node7.

First, remove Node and NPM.
```
sudo apt-get remove nodejs
```
```
sudo apt-get remove npm
```

Next, update the package manager.
```
sudo apt update
```
The apt update command doesn't actually update anything, it just downloads the most up to date packages. So to install them, run:
```
sudo apt full-upgrade
```

Once the package manager is up to date, you can go ahead and download Node7 (woop), followed by the install command.
```
curl -sL https://deb.nodesource.com/setup_7.x | sudo -E bash -
```
```
sudo apt-get install nodejs
```
To verify your node version type:
```
node -v
```

## Running a node server on startup

Before we can run the Node server you will need to have the application installed on your Pi. Presuming you have your project on github already, you can get its https address and clone it into your Pi's home folder using the following command, note that your_username and some_awesome_project will be your actual username and project name.
```
git clone https://github.com/your_username/some_awesome_project.git:/home/pi
```

Next, change directory into that folder using the following commands to install all of your projects dependencies, again replacing some_awesome_project with your projects actual name.
```
cd /home/pi/some_awesome_project
```
```
npm install
```

Now, make sure everything is working by starting up your Node server. Usually this is the command `npm start` but it may be `node server`.
```
npm start
```

Once your server is running, you can go ahead and create a server file. Create this in the systemd directory using the following command:
```
sudo nano /etc/systemd/system/node-server.service
```
Then add the following code replacing the path to some_awesome_project in the WorkingDirectory and ExecStart lines with the path to your Node application. The Exec start line in the example is the equivalent to running the command `node server.js` so you may need to change this to `ExecStart=/usr/bin/npm start` if you start your project with the `npm start` command.
```
[Service]
WorkingDirectory=/home/pi/some_awesome_project
ExecStart=/usr/local/bin/node --expose-gc /home/pi/some_awesome_project/server.js
Restart=always
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=nodeServer
User=root
Group=root
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```
Exit nano with `ctrl + x` and press `Y` to save the file. You can then activate the system file with the following command:
```
sudo systemctl enable node-server
```

To check that it worked, reboot your Pi using `sudo reboot` and once it has loaded back up, use the browser navigate to the port that your server usually runs on, eg: `http://localhost:3000` and you should see your Node application running.

## Booting Chromium into kiosk mode on start up

The last step in the process is to boot the chromium-browser into kiosk mode to show your Node application full screen. To do this you need to add one line of code to the autostart file. To edit your autostart file, use the following command:
```
nano /home/pi/.config/lxsession/LXDE-pi/autostart
```
Add the following line to the bottom of the file. The `--kiosk` flag removes the frame and makes it full screen. The `--incognito` means that it doesn't remember sessions, so if you pull the power chord out of your Pi, you won't get a warning next time you boot up Chromium. Remember to change the port to whatever your node server is running on. If you're not running a node server, you can change the http address to any website address.
```
@chromium-browser --kiosk --incognito http://localhost:3000
```
If you want to remove the mouse pointer you can install unclutter and again add that to the autostart file. Install unclutter using the following command:
```
sudo apt-get install unclutter
```
Again, open your autostart file:
```
nano /home/pi/.config/lxsession/LXDE-pi/autostart
```
and add the following line to the bottom:
```
@unclutter -idle 0.1 -root
```
## Auto reconnect

In testing I found that the Wifi can be a bit flakey on the Raspberry Pi. To combat this you can set up a cronjob that periodically checks the wifi and either forces an attemp to reconnect, or reboots the whole Pi itself. After hours of testing, the force attempt works 9 times out of 10, and is a much softer approach, however it does still break and not come back online. The reboot method works all the time, but is obviously more extreme. Setting up a cronjob for each at different time intervals is probably the best way to guarantee uptime when you're not there to keep an eye on it.

Set up a new bash file with the following command:
```
sudo nano /usr/local/bin/check-wifi.sh
```
Add the following code. The `ping -c4 8.8.8.8 > /dev/null` line will ping google.com 4 times and then feed into the if statement. If the ping process exit's cleanly then $ should be 0, if it cant access google, it will fail. If it fails, it attempts to reconnect wlan0.
```bash
#!/bin/bash

ping -c4 8.8.8.8 > /dev/null
	 
if [ $? != 0 ] 
then
  echo "No network connection, restarting wlan0"
  /sbin/ifdown 'wlan0'
  sleep 5
  /sbin/ifup --force 'wlan0'
fi
```

If you want to use the reboot command, then replace the if statement with the following one:
```bash
if [ $? != 0 ] 
then
  sudo /sbin/shutdown -r now
fi
```
To make sure the right permissions are set to run the cronjob, set them using the following command:
```
sudo chmod 775 /usr/local/bin/check-wifi.sh
```
Next, open crontab using:
```
crontab -e
```
Add the following line. The `*/1` means the cronjob will run every 1 minute. It then runs `sudo` and gives the root access to the home directory using `-H` so that it can run the bash script. `> /dev/null 2>&1` is a redirect to dump syslogs and syserrors into a void.
```
*/1 * * * * /usr/bin/sudo -H /usr/local/bin/check-wifi.sh > /dev/null 2>&1
```

## Setting timezone

Sometimes the raspberry pi time can end up out of sync. To fix this, install nptdate with the following command:

```
sudo apt-get install ntpdate
```

Once installed, run the configuration using:

```
sudo raspi-config
```

Choose localisation settings and set yout timezone. Once you reboot the Pi, the time should sync back up.
