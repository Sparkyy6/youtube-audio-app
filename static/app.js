const statusEl = document.getElementById("status");
const toggleTheme = document.getElementById("toggleTheme");
const urlInput = document.getElementById("urlInput");
const resolveBtn = document.getElementById("resolveBtn");
const audioEl = document.getElementById("audio");
const artworkEl = document.getElementById("artwork");
const trackTitleEl = document.getElementById("trackTitle");
const trackArtistEl = document.getElementById("trackArtist");

const setStatus = (text) => {
  if (statusEl) {
    statusEl.textContent = text;
  }
};

const setArtwork = (url) => {
  if (!artworkEl) return;
  if (url) {
    artworkEl.style.backgroundImage = `url("${url}")`;
    artworkEl.style.backgroundSize = "cover";
    artworkEl.style.backgroundPosition = "center";
  } else {
    artworkEl.style.backgroundImage = "";
  }
};

const resolveAudio = async () => {
  const url = urlInput?.value?.trim();
  if (!url) {
    setStatus("Paste a YouTube link first.");
    return;
  }

  setStatus("Resolving audio stream...");
  try {
    const response = await fetch("/api/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Failed to resolve audio");
    }

    if (trackTitleEl) trackTitleEl.textContent = payload.title || "Unknown";
    if (trackArtistEl) {
      trackArtistEl.textContent = payload.webpage_url || "YouTube";
    }
    setArtwork(payload.thumbnail);

    if (audioEl) {
      const directUrl = payload.audio_url;
      audioEl.src = directUrl;
      audioEl.load();
      setStatus("Ready to play");

      let proxyTried = false;
      audioEl.onerror = () => {
        if (proxyTried) {
          setStatus("Playback failed. Try another link.");
          return;
        }
        // Proxy fallback for CORS or signed URL issues.
        proxyTried = true;
        setStatus("Direct stream blocked. Switching to proxy...");
        audioEl.src = `/api/proxy?url=${encodeURIComponent(directUrl)}`;
        audioEl.load();
      };
    }
  } catch (error) {
    setStatus(error.message || "Unexpected error");
  }
};

if (toggleTheme) {
  toggleTheme.addEventListener("click", () => {
    document.body.classList.toggle("glow");
  });
}

if (resolveBtn) {
  resolveBtn.addEventListener("click", resolveAudio);
}

if (urlInput) {
  urlInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      resolveAudio();
    }
  });
}

setStatus("Ready");
