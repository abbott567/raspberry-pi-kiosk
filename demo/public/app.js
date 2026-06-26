// Updates the clock and shows an offline overlay when the Node server can't be
// reached. The overlay is the custom error screen if the internet drops.
const timeEl = document.getElementById('time');
const secondsEl = document.getElementById('seconds');
const dateEl = document.getElementById('date');
const offlineEl = document.getElementById('offline');
const retriesEl = document.getElementById('retries');

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

// Poll the server's health endpoint and toggle the overlay on failure.
// Track consecutive failures so the overlay can show the retry count.
const MAX_RETRIES = 5;
let retries = 0;

async function checkHealth() {
  let online = false;
  try {
    const res = await fetch('/health', { cache: 'no-store' });
    online = res.ok;
  } catch {
    online = false;
  }

  if (online) {
    retries = 0;
  } else {
    retries = Math.min(retries + 1, MAX_RETRIES);
    retriesEl.textContent = `${retries}/${MAX_RETRIES}`;
  }
  offlineEl.hidden = online;
}

checkHealth();
setInterval(checkHealth, 5000);
