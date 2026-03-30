const API_BASE = "http://127.0.0.1:8000";
const OVERLAY_ID = "veri-vigil-overlay";
let currentVideoId = null;
let analyzeTimeout = null;

function getVideoId() {
  const url = new URL(window.location.href);

  // Regular video: youtube.com/watch?v=xxx
  if (url.pathname === "/watch") {
    return url.searchParams.get("v");
  }

  // Shorts: youtube.com/shorts/xxx
  const shortsMatch = url.pathname.match(/^\/shorts\/([^/?]+)/);
  if (shortsMatch) {
    return shortsMatch[1];
  }

  return null;
}

function isYouTubeVideoPage() {
  return !!getVideoId();
}

function isShorts() {
  return window.location.pathname.startsWith("/shorts/");
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getVideoMetadata(retries = 20) {
  for (let i = 0; i < retries; i++) {

    // ── Regular video title selectors ──
    const titleElement =
      document.querySelector("h1.ytd-watch-metadata yt-formatted-string") ||
      document.querySelector("h1.title yt-formatted-string") ||
      document.querySelector("h1.style-scope.ytd-watch-metadata") ||
      // ── Shorts title selectors ──
      document.querySelector("yt-shorts-video-title-view-model .yt-core-attributed-string") ||
      document.querySelector("#shorts-player .title") ||
      document.querySelector("ytd-reel-video-renderer h2 yt-formatted-string") ||
      document.querySelector(".ytShortsVideoTitleViewModelShortsVideoTitle") ||
      document.querySelector("yt-shorts-video-title-view-model");

    const title = titleElement?.textContent?.trim();

    // ── Description (regular videos only — Shorts rarely have one) ──
    const descriptionElement =
      document.querySelector("#description-inline-expander") ||
      document.querySelector("#description") ||
      document.querySelector("ytd-expandable-video-description-body-renderer");

    const description = descriptionElement?.textContent?.trim() || "";

    if (title) {
      return { title, description };
    }

    await wait(700);
  }

  // Last resort for Shorts — use the page title
  const pageTitle = document.title.replace(" - YouTube", "").trim();
  if (pageTitle && pageTitle !== "YouTube") {
    return { title: pageTitle, description: "" };
  }

  return null;
}

function removeOverlay() {
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) existing.remove();
}

function createOverlaySkeleton() {
  removeOverlay();

  const wrapper = document.createElement("div");
  wrapper.id = OVERLAY_ID;
  wrapper.className = "vv-root vv-loading";

  // Position differently for Shorts vs regular
  if (isShorts()) {
    wrapper.style.cssText = "position:fixed;bottom:80px;left:16px;z-index:9999;";
  }

  wrapper.innerHTML = `
    <div class="vv-badge">
      <div class="vv-top-row">
        <span class="vv-logo">🛡️ Veri-Vigil AI Lite</span>
        <span class="vv-status-pill">Analyzing...</span>
      </div>
      <div class="vv-score-row">
        <span class="vv-score-label">Trust score</span>
        <span class="vv-score-value">--</span>
      </div>
      <button class="vv-toggle" type="button">Show details</button>
      <div class="vv-panel" hidden>
        <p class="vv-explanation">Analyzing video metadata...</p>
      </div>
    </div>
  `;

  const toggleButton = wrapper.querySelector(".vv-toggle");
  const panel = wrapper.querySelector(".vv-panel");

  toggleButton.addEventListener("click", () => {
    const isHidden = panel.hasAttribute("hidden");
    if (isHidden) {
      panel.removeAttribute("hidden");
      toggleButton.textContent = "Hide details";
    } else {
      panel.setAttribute("hidden", "true");
      toggleButton.textContent = "Show details";
    }
  });

  document.body.appendChild(wrapper);
  return wrapper;
}

function updateOverlay(result) {
  const wrapper = document.getElementById(OVERLAY_ID) || createOverlaySkeleton();
  const scoreValue = wrapper.querySelector(".vv-score-value");
  const explanation = wrapper.querySelector(".vv-explanation");
  const statusPill = wrapper.querySelector(".vv-status-pill");

  const safe = result.status === "Safe";

  wrapper.classList.remove("vv-loading", "vv-safe", "vv-suspicious");
  wrapper.classList.add(safe ? "vv-safe" : "vv-suspicious");

  scoreValue.textContent = `${result.trust_score}/100`;
  statusPill.textContent = result.status;
  explanation.textContent = result.explanation;
}

function updateOverlayError(message) {
  const wrapper = document.getElementById(OVERLAY_ID) || createOverlaySkeleton();
  const explanation = wrapper.querySelector(".vv-explanation");
  const scoreValue = wrapper.querySelector(".vv-score-value");
  const statusPill = wrapper.querySelector(".vv-status-pill");

  wrapper.classList.remove("vv-loading", "vv-safe");
  wrapper.classList.add("vv-suspicious");
  scoreValue.textContent = "--";
  statusPill.textContent = "Unavailable";
  explanation.textContent = message;
}

async function analyzeCurrentVideo() {
  if (!isYouTubeVideoPage()) {
    removeOverlay();
    currentVideoId = null;
    return;
  }

  const videoId = getVideoId();
  if (!videoId || videoId === currentVideoId) {
    return;
  }

  currentVideoId = videoId;
  createOverlaySkeleton();

  // Shorts need more time to render their title in the DOM
  const waitTime = isShorts() ? 2500 : 0;
  if (waitTime) await wait(waitTime);

  const metadata = await getVideoMetadata();
  if (!metadata) {
    updateOverlayError("Could not extract the video title from the page.");
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    updateOverlay(data);
  } catch (error) {
    updateOverlayError(
      "Backend not reachable. Start the FastAPI server at http://127.0.0.1:8000 and refresh."
    );
    console.error("Veri-Vigil AI Lite error:", error);
  }
}

function observePageChanges() {
  const observer = new MutationObserver(() => {
    clearTimeout(analyzeTimeout);
    analyzeTimeout = setTimeout(() => {
      analyzeCurrentVideo();
    }, 900);
  });

  observer.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true,
  });
}

(function init() {
  analyzeCurrentVideo();
  observePageChanges();
  window.addEventListener("yt-navigate-finish", analyzeCurrentVideo);
  window.addEventListener("popstate", analyzeCurrentVideo);
})();
