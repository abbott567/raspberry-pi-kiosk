// Updates the clock and shows an offline overlay when the Node server can't be
// reached. The overlay is the custom error screen if the internet drops.
const clockEl = document.getElementById('clock');
const dateEl = document.getElementById('date');
const offlineEl = document.getElementById('offline');

function tick() {
  const now = new Date();
  clockEl.textContent = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  dateEl.textContent = now.toLocaleDateString([], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

tick();
setInterval(tick, 1000);

// Poll the server's health endpoint and toggle the overlay on failure.
async function checkHealth() {
  try {
    const res = await fetch('/health', { cache: 'no-store' });
    offlineEl.hidden = res.ok;
  } catch {
    offlineEl.hidden = false;
  }
}

checkHealth();
setInterval(checkHealth, 5000);
