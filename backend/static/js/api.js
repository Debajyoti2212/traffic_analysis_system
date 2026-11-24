/**
 * API Service for AI Smart Traffic & Road Safety Analyser.
 * Automatically resolves whether frontend is running on port 3000 or alongside FastAPI on port 8000.
 */
const BACKEND_BASE = (window.location.port === "8000" || window.location.port === "")
  ? "" 
  : "http://localhost:8000";

const API = {
  // System Health
  async getHealth() {
    const res = await fetch(`${BACKEND_BASE}/api/health`);
    return await res.json();
  },

  // Computer Vision Endpoints
  getStreamUrl(applyClahe = false) {
    return `${BACKEND_BASE}/api/cv/stream-live?apply_clahe=${applyClahe}&t=${Date.now()}`;
  },

  async uploadVideo(file) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${BACKEND_BASE}/api/cv/upload-video`, {
      method: "POST",
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Video upload failed" }));
      throw new Error(err.detail || "Video upload failed");
    }
    return await res.json();
  },

  async resetToDemoVideo() {
    const res = await fetch(`${BACKEND_BASE}/api/cv/reset-demo`, {
      method: "POST"
    });
    return await res.json();
  },

  async restartSession() {
    const res = await fetch(`${BACKEND_BASE}/api/cv/restart-session`, {
      method: "POST"
    });
    return await res.json();
  },

  async stopSession() {
    const res = await fetch(`${BACKEND_BASE}/api/cv/stop-session`, {
      method: "POST"
    });
    return await res.json();
  },

  async getSessionStatus() {
    const res = await fetch(`${BACKEND_BASE}/api/cv/session-status`);
    return await res.json();
  },

  async getVideoStatus() {
    const res = await fetch(`${BACKEND_BASE}/api/cv/video-status`);
    return await res.json();
  },

  async getLiveStats() {
    const res = await fetch(`${BACKEND_BASE}/api/cv/live-stats`);
    if (!res.ok) throw new Error("Failed to fetch live stats");
    return await res.json();
  },

  async processFrame(file, applyClahe = false, lightState = null) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("apply_clahe", applyClahe);
    if (lightState) formData.append("light_state", lightState);

    const res = await fetch(`${BACKEND_BASE}/api/cv/process-frame`, {
      method: "POST",
      body: formData
    });
    return await res.json();
  },

  async getSnapshots() {
    const res = await fetch(`${BACKEND_BASE}/api/cv/snapshots`);
    const data = await res.json();
    if (data.snapshots) {
      data.snapshots = data.snapshots.map(s => {
        let imgUrl = s.image_url || "";
        let plateUrl = s.plate_image_url || "";
        if (BACKEND_BASE) {
          if (imgUrl && !imgUrl.startsWith("http")) imgUrl = `${BACKEND_BASE}${imgUrl}`;
          if (plateUrl && !plateUrl.startsWith("http")) plateUrl = `${BACKEND_BASE}${plateUrl}`;
        }
        return {
          ...s,
          image_url: imgUrl,
          plate_image_url: plateUrl
        };
      });
    }
    return data;
  },

  async runHaarBaseline() {
    const res = await fetch(`${BACKEND_BASE}/api/cv/haar-baseline`);
    return await res.json();
  },

  // Natural Language Processing Endpoints
  async nlpPreprocess(text) {
    const res = await fetch(`${BACKEND_BASE}/api/nlp/preprocess`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    return await res.json();
  },

  async nlpExtractEntities(text) {
    const res = await fetch(`${BACKEND_BASE}/api/nlp/extract-entities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    return await res.json();
  },

  async nlpClassifyUrgency(text) {
    const res = await fetch(`${BACKEND_BASE}/api/nlp/classify-urgency`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    return await res.json();
  },

  async nlpSemanticSearch(query, topK = 4) {
    const res = await fetch(`${BACKEND_BASE}/api/nlp/semantic-search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, top_k: topK })
    });
    return await res.json();
  },

  async nlpCompareEmbeddings(text) {
    const res = await fetch(`${BACKEND_BASE}/api/nlp/compare-embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    return await res.json();
  },

  // CNN vs ViT Image Classification Endpoints
  async classifyEmergency(preset = "ambulance") {
    const res = await fetch(`${BACKEND_BASE}/api/classification/emergency?preset=${preset}`, {
      method: "POST"
    });
    return await res.json();
  },

  async classifyHazard(preset = "pothole") {
    const res = await fetch(`${BACKEND_BASE}/api/classification/hazard?preset=${preset}`, {
      method: "POST"
    });
    return await res.json();
  },

  // Human Review & Alerts
  async updateAlertStatus(challanId, status) {
    const res = await fetch(`${BACKEND_BASE}/api/alerts/review-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challan_id: challanId, status })
    });
    return await res.json();
  },

  // Public Complaints Lifecycle
  async getComplaints(category = null, status = null) {
    const params = new URLSearchParams();
    if (category) params.append("category", category);
    if (status) params.append("status", status);
    const res = await fetch(`${BACKEND_BASE}/api/complaints?${params.toString()}`);
    return await res.json();
  },

  async submitComplaint(data) {
    const res = await fetch(`${BACKEND_BASE}/api/complaints/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  async updateComplaintStatus(complaintId, status) {
    const res = await fetch(`${BACKEND_BASE}/api/complaints/update-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ complaint_id: complaintId, status })
    });
    return await res.json();
  },

  // Traffic & Safety Analytics
  async getAnalyticsSummary() {
    const res = await fetch(`${BACKEND_BASE}/api/analytics/summary`);
    return await res.json();
  },

  // Benchmarking & Audit Endpoints
  async getBenchmarks() {
    const res = await fetch(`${BACKEND_BASE}/api/benchmarks`);
    return await res.json();
  },

  async generateDailyAudit(junctionName = "Sector 14 Smart Junction, NH-44") {
    const res = await fetch(`${BACKEND_BASE}/api/report/generate-audit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ junction_name: junctionName })
    });
    return await res.json();
  },

  // Machine Learning Real Model Evaluation
  async getMLEvaluation(dataset = "traffic", refresh = false) {
    const url = `${BACKEND_BASE}/api/ml/evaluation?dataset=${encodeURIComponent(dataset)}&refresh=${refresh}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch ML evaluation data");
    return await res.json();
  },

  async refreshMLEvaluation(dataset = "traffic") {
    const url = `${BACKEND_BASE}/api/ml/evaluation/refresh?dataset=${encodeURIComponent(dataset)}`;
    const res = await fetch(url, { method: "POST" });
    if (!res.ok) throw new Error("Failed to refresh ML evaluation");
    return await res.json();
  },

  async getMLDatasets() {
    const res = await fetch(`${BACKEND_BASE}/api/ml/datasets`);
    if (!res.ok) throw new Error("Failed to fetch ML datasets");
    return await res.json();
  },

  // Applied AI Syllabus Alignment Endpoints
  async getNLPEvaluation() {
    const res = await fetch(`${BACKEND_BASE}/api/nlp/evaluation`);
    if (!res.ok) throw new Error("Failed to fetch NLP evaluation");
    return await res.json();
  },

  async getSyllabusMapping() {
    const res = await fetch(`${BACKEND_BASE}/api/syllabus/mapping`);
    if (!res.ok) throw new Error("Failed to fetch syllabus mapping");
    return await res.json();
  },

  async getCVBasicsDemo() {
    const res = await fetch(`${BACKEND_BASE}/api/cv/demo-cv-basics`);
    if (!res.ok) throw new Error("Failed to fetch CV basics demo");
    return await res.json();
  },

  async demoNLPBasics(text = "") {
    const res = await fetch(`${BACKEND_BASE}/api/nlp/demo-nlp-basics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    if (!res.ok) throw new Error("Failed to run NLP basics demo");
    return await res.json();
  }
};
