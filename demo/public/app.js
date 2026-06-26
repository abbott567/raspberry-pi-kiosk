// Updates the clock and shows an offline overlay when the Node server can't be
// reached. The overlay is the custom error screen if the internet drops.
const timeEl = document.getElementById('time');
const secondsEl = document.getElementById('seconds');
const dateEl = document.getElementById('date');
const offlineEl = document.getElementById('offline');
const statusEl = document.getElementById('status');

function tick() {
  const now = new Date();
  timeEl.textContent = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  secondsEl.textContent = now.toLocaleTimeString([], {
    second: '2-digit',
  }).padStart(2, '0');
  dateEl.textContent = now.toLocaleDateString([], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

tick();
setInterval(tick, 1000);

// Poll the server's health endpoint and toggle the overlay on failure. The
// server reports the OS watchdog's real consecutive-failure count from
// check-wifi.sh, so the overlay shows the true countdown and switches to
// "Rebooting…" exactly when the watchdog is about to reboot the Pi.
async function checkHealth() {
  let online = false;
  let failures = null;
  let maxFailures = null;
  try {
    const res = await fetch('/health', { cache: 'no-store' });
    online = res.ok;
    const data = await res.json();
    failures = data.failures;
    maxFailures = data.maxFailures;
  } catch {
    // Local server unreachable: we can't know the watchdog count, so just retry.
    online = false;
  }

  if (!online) {
    if (failures === null || maxFailures === null) {
      statusEl.textContent = 'Retrying…';
    } else if (failures >= maxFailures) {
      statusEl.textContent = 'Rebooting…';
    } else {
      statusEl.innerHTML = `Retrying… <span id="retries">${failures}/${maxFailures}</span>`;
    }
  }
  offlineEl.hidden = online;
}

checkHealth();
setInterval(checkHealth, 5000);
