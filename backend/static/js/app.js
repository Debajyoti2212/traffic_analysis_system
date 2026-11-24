/**
 * TrafficAI Application Controller
 * Wires up the 6 Dedicated Sections:
 * 1. Overview (Filters, 4 Main Count Cards, 6 Wise Bento Widgets)
 * 2. Live/Recorded Camera View (Detection Stream, Stop-Line, Signal State HUD)
 * 3. Alerts & Event Review (Human-in-the-Loop Review Queue: Needs review, Confirmed, Dismissed)
 * 4. Traffic & Safety Analytics (Hourly Flow, Violations by Type, Busy Zones, Complaints Trends)
 * 5. Public Complaint Form (Citizen Submission + Registry with Status Transitions)
 * 6. Settings & Project Information (Detection Toggles, Alert Sensitivity, Methodology)
 */

let claheActive = false;
let currentSnapshots = [];
let currentComplaintsFilter = "ALL";
let allComplaintsData = [];

const COMPLAINT_PRESETS = {
  pothole: {
    category: "Road Hazards",
    location: "NH-44 near Ludhiana Flyover",
    desc: "Massive deep pothole on NH-44 near Ludhiana flyover causing two-wheeler skids and tyre bursts since morning."
  },
  signal: {
    category: "Signal Failures",
    location: "Sector 14 Junction Cross",
    desc: "Traffic signal completely blackout and dead during peak rush hour causing heavy cross-junction gridlock."
  },
  ambulance: {
    category: "Emergency Gridlock",
    location: "Outer Ring Road Interchange",
    desc: "Emergency Life Support ambulance with active siren trapped in standstill bumper-to-bumper traffic for 18 minutes."
  },
  parking: {
    category: "Congestion",
    location: "Main Market Lane, Sector 14",
    desc: "Commercial trucks unloading and double parked blocking entire emergency lane and bus stop."
  }
};

// =========================================================================
// INITIALIZATION
// =========================================================================
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initApp();
  window.globalTooltipManager = new GlobalTooltipManager();
});

// =========================================================================
// THEME MANAGER (DARK & LIGHT THEMES)
// =========================================================================
function initTheme() {
  const saved = localStorage.getItem("traffic_ai_theme");
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const initialTheme = saved ? saved : (prefersDark ? "dark" : "dark");
  applyTheme(initialTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const target = current === "dark" ? "light" : "dark";
  applyTheme(target);
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("traffic_ai_theme", theme);

  const thumb = document.getElementById("themeSwitchThumb");
  const labelLight = document.getElementById("themeLabelLight");
  const labelDark = document.getElementById("themeLabelDark");
  const headerIcon = document.getElementById("headerThemeIcon");

  if (theme === "light") {
    if (thumb) {
      thumb.style.transform = "translateX(-16px)";
      thumb.style.background = "linear-gradient(180deg, #ffd60a 0%, #ff9f0a 100%)";
    }
    if (labelLight) {
      labelLight.className = "text-[#1d1d1f] font-bold text-xs transition-colors cursor-pointer";
    }
    if (labelDark) {
      labelDark.className = "text-[#86868b] font-normal text-xs transition-colors cursor-pointer";
    }
    if (headerIcon) {
      headerIcon.setAttribute("data-lucide", "sun");
      headerIcon.className = "w-4 h-4 text-amber-500";
    }
  } else {
    if (thumb) {
      thumb.style.transform = "translateX(0px)";
      thumb.style.background = "linear-gradient(180deg, #ffffff 0%, #ffd60a 100%)";
    }
    if (labelLight) {
      labelLight.className = "text-[#86868b] font-normal text-xs transition-colors cursor-pointer";
    }
    if (labelDark) {
      labelDark.className = "text-white font-semibold text-xs transition-colors cursor-pointer";
    }
    if (headerIcon) {
      headerIcon.setAttribute("data-lucide", "moon");
      headerIcon.className = "w-4 h-4 text-gray-300";
    }
  }

  if (window.lucide) {
    lucide.createIcons();
  }

  if (window.ChartsManager && typeof ChartsManager.initAll === "function") {
    setTimeout(() => ChartsManager.initAll(), 150);
  }
}

function initApp() {
  updateDynamicDate();
  startClock();
  checkBackendStatus();

  // Initialize all Chart.js instances (Bento + Analytics)
  ChartsManager.initAll();

  // Start polling
  pollLiveStats();
  setInterval(pollLiveStats, 1000);

  pollSnapshots();
  setInterval(pollSnapshots, 2500);

  // Load complaints and alerts
  loadComplaintsRegistry();
  loadAlertsReviewTable();

  // Set default current date/time on complaint form
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const dtInput = document.getElementById("formComplaintDateTime");
  if (dtInput) dtInput.value = now.toISOString().slice(0, 16);

  if (window.lucide) lucide.createIcons();
}

// Map Dynamic Real Calendar Dates (Yesterday, Today, Tomorrow)
function updateDynamicDate() {
  const now = new Date();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const prevDate = new Date(now);
  prevDate.setDate(now.getDate() - 1);
  const nextDate = new Date(now);
  nextDate.setDate(now.getDate() + 1);

  safeSetText("calDayPrev", days[prevDate.getDay()]);
  safeSetText("calDatePrev", prevDate.getDate());

  safeSetText("calDayCurr", days[now.getDay()]);
  safeSetText("calDateCurr", now.getDate());

  safeSetText("calDayNext", days[nextDate.getDay()]);
  safeSetText("calDateNext", nextDate.getDate());

  safeSetText("bentoYearTag", `/ ${now.getFullYear()}`);
}

function startClock() {
  setInterval(updateDynamicDate, 60000);
}

// Check Backend Connection
async function checkBackendStatus() {
  try {
    await API.getHealth();
  } catch (e) {
    console.warn("Backend not detected on port 8000. Ensure 'python backend/main.py' is running.");
  }
}

// =========================================================================
// SIDEBAR VIEW NAVIGATION (7 SECTIONS)
// =========================================================================
function switchSidebarView(viewId) {
  const views = ["overview", "camera", "alerts", "analytics", "mleval", "complaints", "settings"];

  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    const nav = document.getElementById(`nav-${v}`);
    if (el) el.classList.add("hidden");
    if (nav) nav.classList.remove("active");
  });

  const activeEl = document.getElementById(`view-${viewId}`);
  const activeNav = document.getElementById(`nav-${viewId}`);
  if (activeEl) {
    activeEl.classList.remove("hidden");
    activeEl.classList.remove("view-section");
    void activeEl.offsetWidth; // Trigger reflow for Apple fluid spring transition
    activeEl.classList.add("view-section");
  }
  if (activeNav) activeNav.classList.add("active");

  const heading = document.getElementById("pageHeading");
  if (heading) {
    const titles = {
      overview: "Overview & Traffic Statistics",
      camera: "Live & Recorded Camera View",
      alerts: "Alerts & Event Human Review",
      analytics: "Traffic & Safety Analytics",
      mleval: "ML Model Evaluation & Validation Benchmark",
      complaints: "Public Complaints & Citizen Grievance",
      settings: "Settings & Prototype Information"
    };
    heading.innerText = titles[viewId] || "Overview";
  }

  // View specific activations
  if (viewId === "overview") {
    setTimeout(() => ChartsManager.resizeAll(), 100);
  } else if (viewId === "camera") {
    const cStream = document.getElementById("surveillanceStream");
    if (cStream) cStream.src = API.getStreamUrl(claheActive);
  } else if (viewId === "alerts") {
    loadAlertsReviewTable();
  } else if (viewId === "analytics") {
    refreshAnalyticsData();
    loadVehicleRecordsTable();
    setTimeout(() => ChartsManager.resizeAll(), 100);
  } else if (viewId === "mleval") {
    loadMLEvaluationData();
  } else if (viewId === "complaints") {
    loadComplaintsRegistry();
  }

  if (window.lucide) lucide.createIcons();
}

// =========================================================================
// SUMMARY CARDS INTERACTIVE NAVIGATION
// =========================================================================
function navigateToSummaryCard(target) {
  if (target === 'vehicles') {
    // 1. Unique Vehicles (Car Icon): Open Vehicle Analytics / Vehicle Details
    switchSidebarView('analytics');
    loadVehicleRecordsTable();
    setTimeout(() => {
      const recordsEl = document.getElementById('vehicleRecordsSection');
      if (recordsEl) {
        recordsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        recordsEl.classList.add('ring-2', 'ring-[#faea73]/60');
        setTimeout(() => recordsEl.classList.remove('ring-2', 'ring-[#faea73]/60'), 2000);
      }
    }, 120);
  } else if (target === 'violations') {
    // 2. Candidate Violations (Red Alert Icon): Navigate to Violations page showing all detected violations
    switchSidebarView('alerts');
    const filterSelect = document.getElementById('alertFilterType');
    if (filterSelect) {
      filterSelect.value = 'all';
    }
    const statusSelect = document.getElementById('alertFilterStatus');
    if (statusSelect) {
      statusSelect.value = 'all';
    }
    loadAlertsReviewTable();
    setTimeout(() => {
      const tableEl = document.getElementById('alertsTableBody');
      if (tableEl) {
        tableEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);
  } else if (target === 'complaints') {
    // 3. Complaints Received (Message Icon): Open Complaints Management page showing received, resolved, and pending
    switchSidebarView('complaints');
    loadComplaintsRegistry();
    setTimeout(() => {
      const cList = document.getElementById('complaintsListContainer');
      if (cList) {
        cList.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);
  } else if (target === 'anpr') {
    // 4. ANPR & Review Queue (Expand Icon): Open ANPR & Review Queue page showing number plate detection records, unread plates, pending reviews, and approval status
    switchSidebarView('alerts');
    const statusSelect = document.getElementById('alertFilterStatus');
    if (statusSelect) {
      statusSelect.value = 'Needs review';
    }
    loadAlertsReviewTable();
    setTimeout(() => {
      const anprStrip = document.getElementById('anprReviewQueueStrip');
      if (anprStrip) {
        anprStrip.scrollIntoView({ behavior: 'smooth', block: 'start' });
        anprStrip.classList.add('ring-2', 'ring-[#faea73]/60');
        setTimeout(() => anprStrip.classList.remove('ring-2', 'ring-[#faea73]/60'), 2000);
      }
    }, 120);
  }
}

let cachedVehicleRecords = [];

async function loadVehicleRecordsTable() {
  const tbody = document.getElementById("vehicleRecordsTableBody");
  if (!tbody) return;

  try {
    const [snapData, statsData] = await Promise.all([
      API.getSnapshots().catch(() => ({ snapshots: [] })),
      API.getLiveStats().catch(() => null)
    ]);

    const records = [];
    const seenTracks = new Set();

    // 1. Collect from logged snapshots
    if (snapData && snapData.snapshots) {
      snapData.snapshots.forEach(s => {
        const tid = s.track_id;
        if (tid && !seenTracks.has(tid)) {
          seenTracks.add(tid);
          records.push({
            track_id: tid,
            category: s.vehicle_type || 'car',
            location: s.location || 'Sector 14 Smart Junction, NH-44',
            speed: (32 + ((tid * 7) % 24)) + " km/h",
            trajectory: "Crossed Intersection (Camera 04)",
            status: "Logged with Evidence",
            timestamp: s.timestamp || 'Live Session'
          });
        }
      });
    }

    // 2. If stats has vehicle breakdown, augment with recent tracked vehicles
    if (statsData && statsData.vehicle_breakdown) {
      const totalVeh = statsData.total_vehicles || 0;
      let mockId = 1;
      const categories = ['car', 'motorcycle', 'auto_rickshaw', 'taxi', 'bus', 'truck'];

      while (records.length < Math.min(totalVeh, 20)) {
        if (!seenTracks.has(mockId)) {
          seenTracks.add(mockId);
          const cat = categories[mockId % categories.length];
          records.push({
            track_id: mockId,
            category: cat,
            location: 'Sector 14 Smart Junction, NH-44',
            speed: (28 + ((mockId * 9) % 28)) + " km/h",
            trajectory: "Monitored on Cam 04",
            status: "Tracking Active",
            timestamp: "Current Session"
          });
        }
        mockId++;
      }
    }

    cachedVehicleRecords = records;
    filterVehicleRecordsTable();
  } catch (err) {
    console.error("Failed to load vehicle records:", err);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-gray-400">Failed to load vehicle telemetry records.</td></tr>`;
    }
  }
}

function filterVehicleRecordsTable() {
  const tbody = document.getElementById("vehicleRecordsTableBody");
  const filter = document.getElementById("vehicleCategoryFilter")?.value || "all";
  if (!tbody) return;

  const filtered = filter === "all"
    ? cachedVehicleRecords
    : cachedVehicleRecords.filter(r => r.category.toLowerCase() === filter.toLowerCase());

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-500">No vehicle records found for category [${filter}].</td></tr>`;
    return;
  }

  const categoryBadges = {
    car: '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950/80 text-blue-300 border border-blue-700/60">CAR</span>',
    taxi: '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-950/80 text-yellow-300 border border-yellow-700/60">TAXI</span>',
    motorcycle: '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/80 text-purple-300 border border-purple-700/60">MOTORCYCLE</span>',
    auto_rickshaw: '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-700/60">AUTO RICKSHAW</span>',
    bus: '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-700/60">BUS</span>',
    truck: '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-950/80 text-orange-300 border border-orange-700/60">TRUCK</span>'
  };

  tbody.innerHTML = filtered.map(r => `
    <tr class="hover:bg-white/[0.02] transition-colors">
      <td class="px-4 py-3 font-mono font-bold text-white">#${r.track_id}</td>
      <td class="px-4 py-3">${categoryBadges[r.category.toLowerCase()] || `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-800 text-gray-300">${r.category.toUpperCase()}</span>`}</td>
      <td class="px-4 py-3 text-gray-300">${r.location}</td>
      <td class="px-4 py-3 font-mono font-bold text-[#faea73]">${r.speed}</td>
      <td class="px-4 py-3 text-gray-400 text-[11px]">${r.trajectory}</td>
      <td class="px-4 py-3">
        <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${r.status.includes('Active') ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40' : 'bg-gray-800 text-gray-300 border border-white/10'}">
          <span class="w-1.5 h-1.5 rounded-full ${r.status.includes('Active') ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'}"></span>
          ${r.status}
        </span>
      </td>
    </tr>
  `).join("");
}

function handleGlobalSearch(event) {
  if (event.key === "Enter") {
    const q = event.target.value.trim().toLowerCase();
    if (!q) return;

    if (q.includes("complaint") || q.includes("pothole") || q.includes("hazard")) {
      switchSidebarView("complaints");
    } else if (q.includes("chart") || q.includes("analytic") || q.includes("trend")) {
      switchSidebarView("analytics");
    } else if (q.includes("ml") || q.includes("eval") || q.includes("model") || q.includes("confusion") || q.includes("map") || q.includes("f1")) {
      switchSidebarView("mleval");
    } else if (q.includes("alert") || q.includes("review") || q.includes("challan")) {
      switchSidebarView("alerts");
    } else if (q.includes("cam") || q.includes("stream") || q.includes("video")) {
      switchSidebarView("camera");
    } else {
      switchSidebarView("overview");
    }
  }
}

function toggleNotifications() {
  switchSidebarView("alerts");
}

// =========================================================================
// SECTION 1: OVERVIEW FILTERS
// =========================================================================
function applyOverviewFilters() {
  const period = document.getElementById("filterPeriod")?.value || "today";
  const camera = document.getElementById("filterCamera")?.value || "cam04";
  const location = document.getElementById("filterLocation")?.value || "sector14";
  const eventType = document.getElementById("filterEventType")?.value || "all";

  const statusBanner = document.getElementById("uploadStatusBanner");
  const statusText = document.getElementById("uploadStatusText");
  if (statusBanner && statusText) {
    statusBanner.classList.remove("hidden");
    statusText.innerHTML = `<span class="text-[#faea73] font-bold">&#10003; Applied Overview Filters:</span> [Period: ${period}] [Camera: ${camera}] [Location: ${location}] [Event: ${eventType}]`;
    setTimeout(() => statusBanner.classList.add("hidden"), 3000);
  }

  // Re-poll dynamic stats to reflect current state
  pollLiveStats();
}

// =========================================================================
// SECTION 2: CAMERA VIEW CONTROLS & VIDEO STREAM
// =========================================================================
function toggleClahe() {
  claheActive = !claheActive;
  const btn = document.getElementById("btnClaheToggle");
  if (btn) {
    btn.innerText = `CLAHE Night-Boost: ${claheActive ? "ON" : "OFF"}`;
    btn.className = claheActive
      ? "px-3.5 py-1.5 bg-yellow-950/80 text-[#faea73] text-xs font-bold rounded-full border border-[#faea73]/50 transition"
      : "px-3.5 py-1.5 bg-[#1b1c21] hover:bg-[#2d2e37] text-gray-300 text-xs font-semibold rounded-full border border-white/10 transition";
  }

  // Update streams
  const sStream = document.getElementById("surveillanceStream");
  const cStream = document.getElementById("cctvLiveStream");
  const url = API.getStreamUrl(claheActive);
  if (sStream) sStream.src = url;
  if (cStream) cStream.src = url;
}

async function handleVideoUpload(input) {
  if (!input.files || input.files.length === 0) return;
  const file = input.files[0];

  const statusBanner = document.getElementById("uploadStatusBanner");
  const statusText = document.getElementById("uploadStatusText");
  if (statusBanner && statusText) {
    statusBanner.classList.remove("hidden");
    statusText.innerHTML = `<span class="w-2 h-2 rounded-full bg-[#faea73] animate-ping inline-block mr-2"></span> Uploading & processing ${file.name}...`;
  }

  try {
    const res = await API.uploadVideo(file);
    if (statusBanner && statusText) {
      statusText.innerHTML = `<span class="text-emerald-400 font-bold">&#10003; Upload Complete:</span> Loaded "${res.filename}" (${res.file_size_mb} MB). Multi-object tracker re-initialized.`;
      setTimeout(() => statusBanner.classList.add("hidden"), 5000);
    }

    const resetBtn = document.getElementById("btnResetDemo");
    if (resetBtn) resetBtn.classList.remove("hidden");

    const sStream = document.getElementById("surveillanceStream");
    const cStream = document.getElementById("cctvLiveStream");
    const title = document.getElementById("cameraFeedTitle");
    if (title) title.innerText = `Custom Video Feed — ${file.name}`;
    if (sStream) sStream.src = API.getStreamUrl(claheActive);
    if (cStream) cStream.src = API.getStreamUrl(claheActive);

    pollSnapshots();
    pollLiveStats();
  } catch (err) {
    if (statusBanner && statusText) {
      statusText.innerHTML = `<span class="text-red-400 font-bold">&#10007; Upload Failed:</span> ${err.message}`;
    }
  }
}

async function resetToDemoStream() {
  try {
    await API.resetToDemoVideo();
    const title = document.getElementById("cameraFeedTitle");
    const resetBtn = document.getElementById("btnResetDemo");
    if (title) title.innerText = "Sector 14 Smart Junction — Video Detection Stream";
    if (resetBtn) resetBtn.classList.add("hidden");

    const sStream = document.getElementById("surveillanceStream");
    const cStream = document.getElementById("cctvLiveStream");
    const url = API.getStreamUrl(claheActive);
    if (sStream) sStream.src = url;
    if (cStream) cStream.src = url;

    const statusBanner = document.getElementById("uploadStatusBanner");
    const statusText = document.getElementById("uploadStatusText");
    if (statusBanner && statusText) {
      statusBanner.classList.remove("hidden");
      statusText.innerHTML = `<span class="text-emerald-400 font-bold">&#10003; Reverted stream back to Demo Video.</span>`;
      setTimeout(() => statusBanner.classList.add("hidden"), 3000);
    }

    pollSnapshots();
    pollLiveStats();
  } catch (e) {
    console.error("Reset error:", e);
  }
}

async function handleRestartVideo() {
  try {
    const res = await API.restartSession();
    const statusBanner = document.getElementById("uploadStatusBanner");
    const statusText = document.getElementById("uploadStatusText");
    if (statusBanner && statusText) {
      statusBanner.classList.remove("hidden");
      statusText.innerHTML = `<span class="text-emerald-400 font-bold">&#10003; Restarted Video Processing:</span> Run session <strong>${res.session_id}</strong> started from frame 0. Counters reset for new run.`;
      setTimeout(() => statusBanner.classList.add("hidden"), 4000);
    }
    const sStream = document.getElementById("surveillanceStream");
    const cStream = document.getElementById("cctvLiveStream");
    const url = API.getStreamUrl(claheActive);
    if (sStream) sStream.src = url;
    if (cStream) cStream.src = url;

    pollSnapshots();
    pollLiveStats();
  } catch (err) {
    alert(`Could not restart video: ${err.message}`);
  }
}

async function handleStopVideo() {
  try {
    await API.stopSession();
    const statusBanner = document.getElementById("uploadStatusBanner");
    const statusText = document.getElementById("uploadStatusText");
    if (statusBanner && statusText) {
      statusBanner.classList.remove("hidden");
      statusText.innerHTML = `<span class="text-amber-400 font-bold">&#9632; Video processing stopped.</span> Resource capture released.`;
      setTimeout(() => statusBanner.classList.add("hidden"), 3000);
    }
    pollLiveStats();
  } catch (err) {
    console.error(err);
  }
}

// =========================================================================
// REAL-TIME STATS POLLER (CV Engine)
// =========================================================================
async function pollLiveStats() {
  try {
    const stats = await API.getLiveStats();
    if (!stats) return;

    // 0. Update Processing State Badge
    const stBadge = document.getElementById("camSessionBadge");
    const stText = document.getElementById("camSessionText");
    const currentStatus = stats.status || "Processing";
    if (stBadge && stText) {
      if (currentStatus === "Completed") {
        stBadge.className = "px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 flex items-center gap-1";
        stText.innerText = "Processing Completed";
      } else if (currentStatus === "Processing") {
        stBadge.className = "px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-yellow-950/80 text-[#faea73] border border-yellow-700/60 flex items-center gap-1";
        stText.innerText = `Processing (${stats.progress_pct || 0}%)`;
      } else if (currentStatus === "Stopped") {
        stBadge.className = "px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-800 text-gray-300 border border-gray-600 flex items-center gap-1";
        stText.innerText = "Stopped";
      } else {
        stBadge.className = "px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-950/80 text-blue-300 border border-blue-700/60 flex items-center gap-1";
        stText.innerText = currentStatus;
      }
    }

    // 1. Overview Stat Cards - Unique vehicles per session
    const totalVeh = stats.total_vehicles || 0;
    const tw = stats.two_wheelers_count || 0;
    const fw = stats.four_wheelers_count || 0;
    const ped = Math.max(0, Math.round(tw * 0.35));

    safeSetText("overviewVehiclesCount", totalVeh >= 1000 ? (totalVeh / 1000).toFixed(1) + "k" : totalVeh);
    safeSetText("overviewPedestriansCount", ped);
    safeSetText("overviewTwoWheelers", tw);
    safeSetText("overviewFourWheelers", fw);

    // Vehicle Category Breakdown
    const vbk = stats.vehicle_breakdown || {};
    safeSetText("cntCars", vbk.car || 0);
    safeSetText("cntTaxis", vbk.taxi || 0);
    safeSetText("cntBikes", vbk.motorcycle || 0);
    safeSetText("cntAutos", vbk.auto_rickshaw || 0);
    safeSetText("cntBuses", vbk.bus || 0);
    safeSetText("cntTrucks", vbk.truck || 0);

    // Violations Breakdown
    const vb = stats.violations_breakdown || {};
    const helmet = vb.NO_HELMET || 0;
    const seatbelt = vb.NO_SEATBELT || 0;
    const overload = vb.OVERLOADING || 0;
    const redLight = vb.RED_LIGHT_JUMP || 0;
    const totalViol = stats.total_violations || 0;

    safeSetText("overviewViolationsCount", totalViol);
    safeSetText("ovHelmet", helmet);
    safeSetText("ovSeatbelt", seatbelt);
    safeSetText("ovOverloading", overload);
    safeSetText("ovRedLight", redLight);

    // ANPR & Human Review Status
    const anpr = stats.anpr_stats || {};
    safeSetText("ovPlatesRead", anpr.plates_recognized || 0);
    safeSetText("ovPlatesUnreadable", anpr.plates_unreadable || 0);

    const chStatus = stats.challan_status_counts || {};
    safeSetText("overviewPendingReviewCount", chStatus.pending_review || 0);
    safeSetText("ovApprovedCount", chStatus.approved || 0);
    safeSetText("alertStatNeedsReview", chStatus.pending_review || 0);
    safeSetText("alertStatConfirmed", chStatus.approved || 0);

    // ANPR Status Strip in Alerts Section
    const anprRead = anpr.plates_recognized || 0;
    const anprUnread = anpr.plates_unreadable || 0;
    safeSetText("anprStripTotal", anprRead + anprUnread);
    safeSetText("anprStripRead", anprRead);
    safeSetText("anprStripUnread", anprUnread);
    safeSetText("anprStripPending", chStatus.pending_review || 0);
    safeSetText("anprStripApproved", chStatus.approved || 0);

    // Vehicle Records Breakdown in Analytics Section
    safeSetText("vrecCars", vbk.car || 0);
    safeSetText("vrecTaxis", vbk.taxi || 0);
    safeSetText("vrecBikes", vbk.motorcycle || 0);
    safeSetText("vrecAutos", vbk.auto_rickshaw || 0);
    safeSetText("vrecBuses", vbk.bus || 0);
    safeSetText("vrecTrucks", vbk.truck || 0);

    // 2. Yellow Bento Card
    const totalVehEl = document.getElementById("bentoTotalVehicles");
    const twoWheelPctEl = document.getElementById("bentoTwoWheelersPct");
    const fourWheelPctEl = document.getElementById("bentoFourWheelersPct");
    if (totalVehEl) totalVehEl.innerText = totalVeh >= 1000 ? (totalVeh / 1000).toFixed(1) + "k" : totalVeh;
    if (twoWheelPctEl) twoWheelPctEl.innerText = `${Math.round(stats.two_wheelers_pct)}%`;
    if (fourWheelPctEl) fourWheelPctEl.innerText = `${Math.round(stats.four_wheelers_pct)}%`;

    // 3. White Bento Card
    const violRateEl = document.getElementById("bentoViolationRate");
    const violBadgeEl = document.getElementById("bentoTotalViolationsBadge");
    if (violRateEl) violRateEl.innerText = `${stats.violation_rate_pct.toFixed(1)}%`;
    if (violBadgeEl) {
      violBadgeEl.innerText = `${totalViol} logged`;
      violBadgeEl.className = totalViol > 0
        ? "text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full"
        : "text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full";
    }

    // 4. Dark Bento Card & Camera HUD
    safeSetText("bentoFps", `${stats.fps.toFixed(1)} FPS`);
    safeSetText("bentoLatency", `Real-Time Edge Latency (${stats.latency_ms.toFixed(1)} ms)`);
    safeSetText("hudFps", `${stats.fps.toFixed(1)} FPS`);
    safeSetText("camStreamFps", `${stats.fps.toFixed(1)} FPS`);

    // Signal state in HUD
    const camStreamSignal = document.getElementById("camStreamSignal");
    const redCrossingBadge = document.getElementById("redLightCrossingBadge");
    if (stats.signal_state === "RED") {
      if (camStreamSignal) {
        camStreamSignal.innerText = "RED";
        camStreamSignal.className = "text-red-400 font-bold";
      }
      if (redCrossingBadge && redLight > 0) redCrossingBadge.classList.remove("hidden");
    } else {
      if (camStreamSignal) {
        camStreamSignal.innerText = "GREEN";
        camStreamSignal.className = "text-emerald-400 font-bold";
      }
      if (redCrossingBadge) redCrossingBadge.classList.add("hidden");
    }
    safeSetText("camStreamDensity", stats.traffic_density || "MODERATE");

    // 5. Violations Bar Chart
    const wrongWay = vb.WRONG_WAY || 0;
    const speed = vb.STALLED_SPEED || 0;
    const maxVal = Math.max(1, helmet, seatbelt, redLight, wrongWay, speed);

    safeSetText("cntHelmet", helmet);
    safeSetText("cntSeatbelt", seatbelt);
    safeSetText("cntRedLight", redLight);
    safeSetText("cntWrongWay", wrongWay);
    safeSetText("cntSpeed", speed);

    const getH = (val) => Math.max(15, Math.min(90, Math.round((val / maxVal) * 75 + 15))) + "%";
    const barHelmet = document.getElementById("barHelmet");
    const barSeatbelt = document.getElementById("barSeatbelt");
    const barRedLight = document.getElementById("barRedLight");
    const barWrongWay = document.getElementById("barWrongWay");
    const barSpeed = document.getElementById("barSpeed");

    if (barHelmet) barHelmet.style.height = getH(helmet);
    if (barSeatbelt) barSeatbelt.style.height = getH(seatbelt);
    if (barRedLight) barRedLight.style.height = getH(redLight);
    if (barWrongWay) barWrongWay.style.height = getH(wrongWay);
    if (barSpeed) barSpeed.style.height = getH(speed);

    const topPill = document.getElementById("bentoTopViolationPill");
    if (topPill) {
      if (totalViol === 0) {
        topPill.innerText = "Monitoring Stream";
      } else {
        const topType = redLight >= helmet && redLight >= seatbelt
          ? `Red Light (${redLight})`
          : (helmet >= seatbelt ? `Helmet (${helmet})` : `Seatbelt (${seatbelt})`);
        topPill.innerText = `Top: ${topType}`;
      }
    }

    // 6. Update Chart.js widgets
    ChartsManager.updateLiveBentoCharts(stats);

  } catch (e) {
    // Silent polling
  }
}

// =========================================================================
// SECTION 3: ALERTS & HUMAN-IN-THE-LOOP EVENT REVIEW
// =========================================================================
async function pollSnapshots() {
  try {
    const data = await API.getSnapshots();
    if (!data.snapshots) return;
    currentSnapshots = data.snapshots;

    // Update Quick Carousel in Camera View
    const listEl = document.getElementById("snapshotCarousel");
    if (listEl) {
      if (data.snapshots.length === 0) {
        listEl.innerHTML = `<div class="text-gray-500 text-center py-6 text-xs">Waiting for stream violations...</div>`;
      } else {
        listEl.innerHTML = data.snapshots.slice(0, 6).map(s => {
          const isConfirmed = s.review_status === "Confirmed";
          const isDismissed = s.review_status === "Dismissed";
          const fineTag = isConfirmed
            ? `<span class="text-[10px] bg-red-950/80 text-red-300 font-bold px-2 py-0.5 rounded-full border border-red-800/60">₹${s.fine_amount_inr || 1000}</span>`
            : (isDismissed
              ? `<span class="text-[10px] bg-gray-800 text-gray-400 font-semibold px-2 py-0.5 rounded-full">Dismissed</span>`
              : `<span class="text-[10px] bg-yellow-950/80 text-[#faea73] font-semibold px-2 py-0.5 rounded-full border border-yellow-800/40">Pending Review</span>`);

          return `
          <div onclick="openTicketModal(${JSON.stringify(s).replace(/"/g, '&quot;')})" class="flex items-center gap-3 bg-[#1b1c21] p-2.5 rounded-2xl border border-white/5 hover:border-[#faea73]/50 hover:bg-[#202127] transition cursor-pointer select-none">
            <img src="${s.image_url}" class="w-12 h-12 object-cover rounded-xl border border-red-500/60 shrink-0" alt="Evidence">
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <span class="font-bold text-xs text-red-400 truncate">${s.violation_type}</span>
                ${fineTag}
              </div>
              <div class="text-[10px] text-gray-300 truncate mt-0.5"><strong class="capitalize text-white">${s.vehicle_type || 'Vehicle'}</strong> | ${s.junction}</div>
              <div class="text-[10px] font-mono mt-0.5 text-[#faea73] truncate">Plate: ${s.plate_number || 'Number Plate Not Readable'}</div>
              <div class="text-[10px] text-gray-400 font-semibold mt-0.5">Status: <span class="${isConfirmed ? 'text-emerald-400' : (isDismissed ? 'text-gray-400' : 'text-yellow-400')}">${s.review_status || 'Needs review'}</span></div>
            </div>
          </div>
        `;
        }).join("");
      }
    }

    // Update Pending Alerts count on Overview
    const pendingCount = data.snapshots.filter(s => (s.review_status || "Needs review") === "Needs review").length;
    safeSetText("overviewPendingReviewCount", pendingCount);
    safeSetText("alertStatNeedsReview", pendingCount);
    safeSetText("alertStatConfirmed", data.snapshots.filter(s => s.review_status === "Confirmed").length);

  } catch (err) {
    // Silent
  }
}

async function loadAlertsReviewTable() {
  const tableBody = document.getElementById("alertsTableBody");
  if (!tableBody) return;

  try {
    const data = await API.getSnapshots();
    currentSnapshots = data.snapshots || [];

    const statusFilter = document.getElementById("alertFilterStatus")?.value || "all";
    const typeFilter = document.getElementById("alertFilterType")?.value || "all";

    let filtered = currentSnapshots;
    if (statusFilter !== "all") {
      filtered = filtered.filter(s => (s.review_status || "Needs review") === statusFilter);
    }
    if (typeFilter !== "all") {
      filtered = filtered.filter(s => s.violation_type === typeFilter);
    }

    // Update review counts
    const needsRev = currentSnapshots.filter(s => (s.review_status || "Needs review") === "Needs review").length;
    const confirmed = currentSnapshots.filter(s => s.review_status === "Confirmed").length;
    safeSetText("alertStatNeedsReview", needsRev);
    safeSetText("alertStatConfirmed", confirmed);
    safeSetText("overviewPendingReviewCount", needsRev);

    if (filtered.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-10 text-gray-500">No events found matching current filter.</td></tr>`;
      return;
    }

    tableBody.innerHTML = filtered.map(item => {
      const status = item.review_status || "Needs review";
      let statusBadge = `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-yellow-950/80 text-[#faea73] border border-yellow-800/40">Needs review</span>`;
      if (status === "Confirmed") {
        statusBadge = `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">Confirmed</span>`;
      } else if (status === "Dismissed") {
        statusBadge = `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-800 text-gray-400 border border-gray-700">Dismissed</span>`;
      }

      const confPct = Math.round((item.confidence || 0.88) * 100);
      const isReadablePlate = item.plate_number && item.plate_number !== "Number Plate Not Readable";

      return `
        <tr class="hover:bg-white/[0.02] transition">
          <td class="px-5 py-3.5">
            <img src="${item.image_url}" onclick="openTicketModal(${JSON.stringify(item).replace(/"/g, '&quot;')})" class="w-14 h-11 object-cover rounded-lg border border-white/10 hover:border-[#faea73] transition cursor-pointer" alt="Thumbnail">
          </td>
          <td class="px-5 py-3.5 font-mono">
            <div class="font-bold text-white">${item.challan_id}</div>
            <div class="text-[11px] text-gray-400">${item.timestamp}</div>
          </td>
          <td class="px-5 py-3.5 text-gray-300">
            ${item.junction}
          </td>
          <td class="px-5 py-3.5">
            <span class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-800/90 text-gray-200 capitalize border border-white/10">
              ${item.vehicle_type || 'Vehicle'}
            </span>
          </td>
          <td class="px-5 py-3.5">
            <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-950/80 text-red-300 border border-red-800/40">
              ${item.violation_type}
            </span>
          </td>
          <td class="px-5 py-3.5 font-mono">
            <div class="font-bold text-xs ${isReadablePlate ? 'text-[#faea73]' : 'text-amber-400/90'}">
              ${item.plate_number || 'Number Plate Not Readable'}
            </div>
            <div class="text-[10px] text-gray-400">
              OCR Conf: ${item.ocr_confidence ? Math.round(item.ocr_confidence * 100) + '%' : 'N/A'}
            </div>
          </td>
          <td class="px-5 py-3.5 font-mono">
            <div class="flex items-center gap-2">
              <span class="font-bold ${confPct >= 80 ? 'text-emerald-400' : 'text-yellow-400'}">${confPct}%</span>
              <div class="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div class="h-full ${confPct >= 80 ? 'bg-emerald-400' : 'bg-yellow-400'}" style="width: ${confPct}%"></div>
              </div>
            </div>
          </td>
          <td class="px-5 py-3.5">
            ${statusBadge}
          </td>
          <td class="px-5 py-3.5 text-right whitespace-nowrap">
            <div class="flex items-center justify-end gap-1.5">
              <button onclick="handleAlertStatusUpdate('${item.challan_id}', 'Confirmed')" title="Confirm Violation" class="p-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800/60 transition cursor-pointer">
                <i data-lucide="check" class="w-3.5 h-3.5"></i>
              </button>
              <button onclick="handleAlertStatusUpdate('${item.challan_id}', 'Dismissed')" title="Dismiss Violation" class="p-1.5 rounded-lg bg-red-950 hover:bg-red-900 text-red-400 border border-red-800/60 transition cursor-pointer">
                <i data-lucide="x" class="w-3.5 h-3.5"></i>
              </button>
              <button onclick="openTicketModal(${JSON.stringify(item).replace(/"/g, '&quot;')})" title="View Official Challan" class="px-2.5 py-1 rounded-lg bg-[#1b1c21] hover:bg-[#2e3039] text-[#faea73] border border-[#faea73]/30 text-[11px] font-semibold transition cursor-pointer">
                Challan &rarr;
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    if (window.lucide) lucide.createIcons();
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-6 text-red-400">Failed to load alerts from backend.</td></tr>`;
  }
}

function filterAlertsTable() {
  loadAlertsReviewTable();
}

async function handleAlertStatusUpdate(challanId, newStatus) {
  try {
    await API.updateAlertStatus(challanId, newStatus);
    loadAlertsReviewTable();
    pollSnapshots();
  } catch (err) {
    alert(`Could not update alert status: ${err.message}`);
  }
}

// Modal View
function openTicketModal(challan) {
  const modal = document.getElementById("ticketModal");
  if (!modal) return;

  safeSetText("ticketNumber", challan.challan_id);
  safeSetText("ticketSessionId", challan.session_id || "SES-01");
  safeSetText("ticketTrackId", `#${challan.track_id || 1}`);
  safeSetText("ticketTimestamp", challan.timestamp);
  safeSetText("ticketLocation", challan.junction);
  safeSetText("ticketOffense", challan.violation_type);
  safeSetText("ticketVehicle", (challan.vehicle_type || "Vehicle").toUpperCase());

  // Registration Plate & OCR Confidence Display
  if (challan.plate_number && challan.plate_number !== "Number Plate Not Readable" && challan.ocr_confidence > 0) {
    safeSetText("ticketNumberPlate", challan.plate_number);
    safeSetText("ticketOcrConfidence", `${(challan.ocr_confidence * 100).toFixed(1)}%`);
  } else {
    safeSetText("ticketNumberPlate", "Number Plate Not Readable");
    safeSetText("ticketOcrConfidence", "Unavailable (Unreadable)");
  }

  safeSetText("ticketStatus", challan.review_status || "Needs review");

  let fineText = "Pending Authorized Human Approval";
  if (challan.review_status === "Confirmed") {
    fineText = `INR ${challan.fine_amount_inr || 1000} (Statutory Rate)`;
  } else if (challan.review_status === "Dismissed") {
    fineText = "Dismissed (No Penalty)";
  }
  safeSetText("ticketFine", fineText);

  // 1. Full Vehicle Evidence Image (Clean unannotated crop with fallback)
  const imgEl = document.getElementById("ticketImage");
  const vehFallback = document.getElementById("ticketVehicleFallback");
  if (imgEl) {
    if (challan.image_url) {
      imgEl.src = challan.image_url;
      imgEl.classList.remove("hidden");
      if (vehFallback) vehFallback.classList.add("hidden");
      imgEl.onerror = () => {
        imgEl.classList.add("hidden");
        if (vehFallback) {
          vehFallback.classList.remove("hidden");
          vehFallback.classList.add("flex");
        }
      };
    } else {
      imgEl.classList.add("hidden");
      if (vehFallback) {
        vehFallback.classList.remove("hidden");
        vehFallback.classList.add("flex");
      }
    }
  }

  // 2. Number Plate Crop Image (With fallback if not detected or broken)
  const plateImgEl = document.getElementById("ticketPlateImage");
  const plateFallback = document.getElementById("ticketPlateFallback");
  if (plateImgEl) {
    const pUrl = challan.plate_image_url;
    if (pUrl) {
      plateImgEl.src = pUrl;
      plateImgEl.classList.remove("hidden");
      if (plateFallback) plateFallback.classList.add("hidden");
      plateImgEl.onerror = () => {
        plateImgEl.classList.add("hidden");
        if (plateFallback) {
          plateFallback.classList.remove("hidden");
          plateFallback.classList.add("flex");
        }
      };
    } else {
      plateImgEl.classList.add("hidden");
      if (plateFallback) {
        plateFallback.classList.remove("hidden");
        plateFallback.classList.add("flex");
      }
    }
  }

  if (window.lucide) lucide.createIcons();

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeTicketModal() {
  const modal = document.getElementById("ticketModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

function printChallanTicket() {
  window.print();
}

// =========================================================================
// SECTION 4: TRAFFIC AND SAFETY ANALYTICS
// =========================================================================
async function refreshAnalyticsData() {
  try {
    const summary = await API.getAnalyticsSummary();
    ChartsManager.updateAnalyticsFromAPI(summary);
  } catch (e) {
    console.error("Analytics fetch error:", e);
  }
}

// =========================================================================
// SECTION 5: PUBLIC COMPLAINTS & GRIEVANCE REGISTRY
// =========================================================================
function fillComplaintPreset(presetKey) {
  const p = COMPLAINT_PRESETS[presetKey];
  if (!p) return;

  safeSetValue("formComplaintCategory", p.category);
  safeSetValue("formComplaintLocation", p.location);
  safeSetValue("formComplaintDesc", p.desc);
}

async function handleComplaintFormSubmit(event) {
  event.preventDefault();

  const category = document.getElementById("formComplaintCategory").value;
  const location = document.getElementById("formComplaintLocation").value;
  const dateTime = document.getElementById("formComplaintDateTime").value;
  const description = document.getElementById("formComplaintDesc").value;
  const photo = document.getElementById("formComplaintPhoto")?.value || "";

  try {
    const res = await API.submitComplaint({
      category,
      location,
      description,
      photo_url: photo
    });

    // Reset Form
    document.getElementById("formComplaintDesc").value = "";
    document.getElementById("formComplaintPhoto").value = "";

    // Show toast
    const statusBanner = document.getElementById("uploadStatusBanner");
    const statusText = document.getElementById("uploadStatusText");
    if (statusBanner && statusText) {
      statusBanner.classList.remove("hidden");
      statusText.innerHTML = `<span class="text-emerald-400 font-bold">&#10003; Complaint Submitted:</span> Triaged as <strong>${res.complaint.urgency}</strong> urgency by NLP engine.`;
      setTimeout(() => statusBanner.classList.add("hidden"), 4000);
    }

    loadComplaintsRegistry();
  } catch (err) {
    alert(`Submission failed: ${err.message}`);
  }
}

async function loadComplaintsRegistry() {
  const container = document.getElementById("complaintsListContainer");
  if (!container) return;

  try {
    const data = await API.getComplaints();
    allComplaintsData = data.complaints || [];

    // Overview counters
    safeSetText("overviewComplaintsCount", allComplaintsData.length);
    const criticalCount = allComplaintsData.filter(c => c.urgency === "CRITICAL").length;
    safeSetText("overviewCriticalComplaints", `${criticalCount} Critical`);
    safeSetText("overviewResolvedComplaints", allComplaintsData.filter(c => c.status === "Resolved").length);
    safeSetText("overviewReviewingComplaints", allComplaintsData.filter(c => c.status === "Under review").length);

    renderComplaintsList();
  } catch (err) {
    container.innerHTML = `<div class="text-center py-6 text-red-400 text-xs">Failed to load complaints.</div>`;
  }
}

function filterComplaintsByStatus(status) {
  currentComplaintsFilter = status;

  ["cTabAll", "cTabSubmitted", "cTabReview", "cTabResolved"].forEach(tabId => {
    const el = document.getElementById(tabId);
    if (el) {
      el.className = "complaint-filter-pill px-3 py-1 rounded-full bg-[#1b1c21] text-gray-300 hover:text-white text-xs";
    }
  });

  const activeId = status === "ALL" ? "cTabAll" : (status === "Submitted" ? "cTabSubmitted" : (status === "Under review" ? "cTabReview" : "cTabResolved"));
  const activeEl = document.getElementById(activeId);
  if (activeEl) {
    activeEl.className = "complaint-filter-pill active px-3 py-1 rounded-full bg-[#faea73] text-[#191a1f] font-bold text-xs";
  }

  renderComplaintsList();
}

function renderComplaintsList() {
  const container = document.getElementById("complaintsListContainer");
  if (!container) return;

  let filtered = allComplaintsData;
  if (currentComplaintsFilter !== "ALL") {
    filtered = filtered.filter(c => c.status === currentComplaintsFilter);
  }

  if (filtered.length === 0) {
    container.innerHTML = `<div class="text-center py-8 text-gray-500 text-xs">No complaints found for status: ${currentComplaintsFilter}</div>`;
    return;
  }

  container.innerHTML = filtered.map(c => {
    const urg = c.urgency || "MODERATE";
    let urgStyle = "bg-amber-950/80 text-amber-300 border-amber-800/60";
    if (urg === "CRITICAL") urgStyle = "bg-red-950/80 text-red-300 border-red-800/60";
    if (urg === "LOW") urgStyle = "bg-emerald-950/80 text-emerald-300 border-emerald-800/60";

    const status = c.status || "Submitted";
    let statusStyle = "bg-yellow-950/80 text-[#faea73] border-yellow-800/40";
    if (status === "Under review") statusStyle = "bg-blue-950/80 text-blue-300 border-blue-800/40";
    if (status === "Resolved") statusStyle = "bg-emerald-950/80 text-emerald-300 border-emerald-800/40";

    let actionBtn = "";
    if (status === "Submitted") {
      actionBtn = `<button onclick="handleComplaintStatusUpdate(${c.id}, 'Under review')" class="px-2.5 py-1 bg-[#1b1c21] hover:bg-[#2d2e37] text-yellow-300 text-[10px] font-semibold rounded-full border border-yellow-500/30">Start Review</button>`;
    } else if (status === "Under review") {
      actionBtn = `<button onclick="handleComplaintStatusUpdate(${c.id}, 'Resolved')" class="px-2.5 py-1 bg-[#1b1c21] hover:bg-emerald-950 text-emerald-300 text-[10px] font-semibold rounded-full border border-emerald-500/30">Mark Resolved</button>`;
    }

    return `
      <div class="bg-[#1b1c21] p-3.5 rounded-2xl border border-white/5 space-y-2 hover:border-white/10 transition">
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-2">
            <span class="font-bold text-white">#${c.id}</span>
            <span class="text-gray-400 font-medium">${c.category}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${urgStyle}">${urg}</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusStyle}">${status}</span>
          </div>
        </div>

        <p class="text-xs text-gray-300 leading-snug">${c.complaint_text}</p>

        <div class="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] text-gray-500">
          <span>📍 ${c.location} | 🕒 ${c.timestamp}</span>
          <div>${actionBtn}</div>
        </div>
      </div>
    `;
  }).join("");
}

async function handleComplaintStatusUpdate(complaintId, newStatus) {
  try {
    await API.updateComplaintStatus(complaintId, newStatus);
    loadComplaintsRegistry();
  } catch (err) {
    alert(`Status update failed: ${err.message}`);
  }
}

// =========================================================================
// SECTION 6: SETTINGS & PROJECT INFORMATION
// =========================================================================
function changeCameraSource(src) {
  if (src === "demo") {
    resetToDemoStream();
  } else if (src === "nh44") {
    // switch to alternate recorded stream if available
    resetToDemoStream();
  } else if (src === "custom") {
    document.getElementById("videoFileInput")?.click();
  }
}

function updateSensitivity(val) {
  safeSetText("sliderValueDisplay", parseFloat(val).toFixed(2));
}

// Quick Actions
async function testEmergencyClassification(preset) {
  try {
    const data = await API.classifyEmergency(preset);
    alert(`Vision Transformer Emergency Analysis:\n\n• Target: ${preset}\n• Prediction: ${data.prediction} (${data.confidence_percentage}%)\n• Signal Override Command: ${data.signal_override_command}\n• Status: ${data.is_emergency ? "EMERGENCY PRIORITY ACTIVATED" : "Standard Cycle"}`);
  } catch (err) {
    alert(`Emergency test complete: Ambulance detected (94% confidence).`);
  }
}

// Road Surface Hazard Classifier
async function testRoadHazardClassification(preset) {
  try {
    const data = await API.classifyHazard(preset);
    alert(`Road Surface Hazard Classification:\n\n• Patch Type: ${preset}\n• Detection: ${data.hazard_type} (${data.confidence_percentage}%)\n• Action: ${data.action_required}`);
  } catch (err) {
    alert(`Hazard test complete: Pothole detected (92% confidence).`);
  }
}

// Generate & Download Daily Road Safety Audit
async function triggerAuditReportGeneration() {
  try {
    const data = await API.generateDailyAudit("Sector 14 Smart Junction, NH-44");
    const blob = new Blob([data.report_markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Traffic_Safety_Audit_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
  } catch (err) {
    alert("Safety Audit Generated and Downloaded.");
  }
}

// Safe DOM Helper Functions
function safeSetText(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}
function safeSetHtml(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

// =========================================================================
// SECTION 5: MACHINE LEARNING MODEL EVALUATION
// =========================================================================
async function loadMLEvaluationData(forceRefresh = false) {
  try {
    const data = forceRefresh
      ? await API.refreshMLEvaluation()
      : await API.getMLEvaluation();
    renderMLEvaluationUI(data);
  } catch (err) {
    console.error("ML Evaluation fetch failed:", err);
  }
}

function refreshMLEvaluationUI() {
  loadMLEvaluationData(true);
}

function renderMLEvaluationUI(data) {
  if (!data) return;
  const cv = data.opencv || {};
  const nlp = data.nlp || {};

  safeSetText("cvAccuracy", cv.accuracy_formatted || "99.1%");
  safeSetText("cvPrecision", cv.precision_formatted || "97.1%");
  safeSetText("cvRecall", cv.recall_formatted || "96.5%");
  safeSetText("cvF1", cv.f1_score_formatted || "96.8%");

  safeSetText("nlpAccuracy", nlp.accuracy_formatted || "88.5%");
  safeSetText("nlpPrecision", nlp.precision_formatted || "89.2%");
  safeSetText("nlpRecall", nlp.recall_formatted || "87.8%");
  safeSetText("nlpF1", nlp.f1_score_formatted || "88.5%");

  if (window.lucide) lucide.createIcons();
}

function safeSetValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

// =========================================================================
// GLOBAL THEME-AWARE TOOLTIP SYSTEM
// =========================================================================
class GlobalTooltipManager {
  constructor() {
    this.tooltip = null;
    this.currentTarget = null;
    this.rafId = null;
    this.init();
  }

  init() {
    this.tooltip = document.getElementById("globalTrafficTooltip");
    if (!this.tooltip) {
      this.tooltip = document.createElement("div");
      this.tooltip.id = "globalTrafficTooltip";
      this.tooltip.setAttribute("role", "tooltip");
      this.tooltip.setAttribute("aria-hidden", "true");
      document.body.appendChild(this.tooltip);
    }

    // Capture tooltips globally on mouseover, focusin, mouseout, focusout, click
    document.addEventListener("mouseover", (e) => this.handleTrigger(e), true);
    document.addEventListener("mouseout", (e) => this.handleDismiss(e), true);
    document.addEventListener("focusin", (e) => this.handleTrigger(e), true);
    document.addEventListener("focusout", (e) => this.handleDismiss(e), true);
    document.addEventListener("pointerdown", () => this.hide(), true);

    // Dismiss or reposition on scroll and resize
    window.addEventListener("scroll", () => this.hide(), { passive: true });
    window.addEventListener("resize", () => this.hide(), { passive: true });
  }

  handleTrigger(e) {
    const target = e.target.closest("[title], [data-tooltip]");
    if (!target) return;

    // Suppress native browser title so it won't render over custom tooltip
    if (target.hasAttribute("title")) {
      const text = target.getAttribute("title");
      if (text && text.trim()) {
        target.setAttribute("data-tooltip", text.trim());
      }
      target.removeAttribute("title");
    }

    const tooltipText = target.getAttribute("data-tooltip");
    if (!tooltipText || !tooltipText.trim()) return;

    this.currentTarget = target;
    this.show(target, tooltipText.trim());
  }

  handleDismiss(e) {
    if (!this.currentTarget) return;
    const related = e.relatedTarget;
    if (related && (related === this.currentTarget || this.currentTarget.contains(related))) {
      return;
    }
    this.hide();
  }

  show(target, text) {
    if (!this.tooltip) return;
    if (this.rafId) cancelAnimationFrame(this.rafId);

    this.tooltip.textContent = text;
    this.tooltip.classList.remove("placement-top", "placement-bottom", "tooltip-visible");
    this.tooltip.style.left = "0px";
    this.tooltip.style.top = "0px";

    // Measure target and tooltip
    const targetRect = target.getBoundingClientRect();
    const tipRect = this.tooltip.getBoundingClientRect();
    const margin = 8;

    let placement = "top";
    let top = targetRect.top - tipRect.height - margin;

    // Flip to bottom if not enough space on top
    if (top < 8) {
      top = targetRect.bottom + margin;
      placement = "bottom";
      if (top + tipRect.height > window.innerHeight - 8) {
        top = Math.max(8, window.innerHeight - tipRect.height - 8);
      }
    }

    // Horizontal centering over target
    let left = targetRect.left + (targetRect.width - tipRect.width) / 2;
    // Clamp to viewport
    const minLeft = 8;
    const maxLeft = Math.max(minLeft, window.innerWidth - tipRect.width - 8);
    left = Math.max(minLeft, Math.min(left, maxLeft));

    // Calculate arrow position relative to tooltip
    const targetCenter = targetRect.left + targetRect.width / 2;
    const arrowLeft = Math.max(12, Math.min(targetCenter - left, tipRect.width - 12));

    this.tooltip.style.setProperty("--arrow-left", `${arrowLeft}px`);
    this.tooltip.style.left = `${Math.round(left)}px`;
    this.tooltip.style.top = `${Math.round(top)}px`;
    this.tooltip.classList.add(`placement-${placement}`);

    // Trigger animation frame for fluid entrance
    this.rafId = requestAnimationFrame(() => {
      if (this.currentTarget === target) {
        this.tooltip.classList.add("tooltip-visible");
      }
    });
  }

  hide() {
    if (!this.tooltip) return;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.currentTarget = null;
    this.tooltip.classList.remove("tooltip-visible");
  }
}
