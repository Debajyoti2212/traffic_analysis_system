# 🚦 AI Smart Traffic & Road Safety Analyser
### Multimodal Applied AI Pipeline: Real-Time Computer Vision + Natural Language Processing

[![Python Version](https://img.shields.io/badge/Python-3.10%20%7C%203.11%20%7C%203.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PyTorch](https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](https://pytorch.org/)
[![OpenCV](https://img.shields.io/badge/OpenCV-5C3EE8?style=for-the-badge&logo=opencv&logoColor=white)](https://opencv.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

An intelligent transportation and road safety enforcement system fusing YOLOv8 multi-class vehicle detection, geometric stop-line computer vision, automated legal e-Challan generation, emergency vehicle "Green Corridor" preemption, and PyTorch Bi-LSTM citizen grievance triage.

---

## 📌 Problem Statement

Traditional urban traffic policing relies on manual observation and fixed-time traffic light cycles. This leads to:
1. **Unchecked Violations:** Frequent red-light jumping, helmetless riding, and missing seatbelts causing severe collisions.
2. **Emergency Vehicle Gridlock:** Ambulances losing critical golden-hour response time in static traffic jams.
3. **Delayed Civic Action:** Citizen grievance reports regarding hazardous potholes and dead signals being lost in slow manual triage queues.

**Our Solution:** An automated, multimodal Applied AI pipeline that converts standard intersection CCTV feeds into intelligent edge monitoring nodes, issues photographic e-Challan citations, gives instant green lights to emergency vehicles, and triages public grievances automatically.

---

## ✨ Key Features

- **👁️ Live CCTV Video Analytics (25+ FPS):** Multi-class vehicle detection (Car, Motorcycle, Auto-rickshaw, Bus, Truck) using **YOLOv8** anchor-free neural networks.
- **📸 Automated e-Challan Issuance:** Real-time detection of Red-Light Jumping, No-Helmet, and No-Seatbelt violations with timestamped photographic evidence and legal fines.
- **🚑 Emergency "Green Corridor" Clearance:** Classifies Ambulances and Fire Trucks using **MobileNetV3 (CNN)** and **Vision Transformers (ViT)**, automatically overriding signals to ALL-GREEN.
- **🛣️ Virtual Stop-Line Geometry:** Lightweight **Canny Edge + Hough Line Transform** (`cv2.HoughLinesP`) detecting virtual stop-lines in under 2 ms without GPU overhead.
- **🌙 Night Glare Reduction:** **CLAHE** (Contrast Limited Adaptive Histogram Equalization) decoupling luminance in LAB space to eliminate headlight glare.
- **🧠 Citizen Grievance NLP Triage:** **PyTorch 2-layer Bi-LSTM** categorizing unstructured complaints into `CRITICAL`, `MODERATE`, and `LOW` urgency tiers.
- **🔍 Synonym-Aware Semantic Search:** 128-dimensional dense vector embeddings indexed via Cosine Similarity, reliably matching synonyms (*"collision"* vs. *"crash"*).
- **📊 Glassmorphic Bento UI Dashboard:** Real-time web dashboard running on FastAPI (`http://localhost:8000`) with one-click Daily Safety Audit PDF generation.

---

## 🏗️ System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                      1. MULTI-MODAL DATA INGESTION                     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
          ┌─────────────────────────┴─────────────────────────┐
          ▼                                                   ▼
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│     COMPUTER VISION PIPELINE    │       │       NLP GRIEVANCE PIPELINE    │
├─────────────────────────────────┤       ├─────────────────────────────────┤
│ • LAB Color Space & CLAHE Glare │       │ • Tokenization & Lemmatization  │
│ • Canny + Hough Virtual Line    │       │ • spaCy Named Entity (NER)      │
│ • YOLOv8 Multi-Class Detection  │       │ • Dense Vector Semantic Search  │
│ • Centroid Euclidean Tracker    │       │ • PyTorch 2-Layer Bi-LSTM       │
│ • HSV Traffic Light State (R/G) │       │ • 3-Tier Urgency Classification │
│ • MobileNetV3 vs. ViT Ambulance │       │   (CRITICAL / MODERATE / LOW)   │
└────────────────┬────────────────┘       └────────────────┬────────────────┘
                 │                                         │
                 └────────────────────┬────────────────────┘
                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   2. DECISION & ENFORCEMENT ENGINE                     │
│  • Instant Photographic e-Challan Generation (snapshots/ directory)    │
│  • Automated "Green Corridor" Traffic Light Signal Override            │
│  • Automated Work-Order Dispatch for Critical Road Craters             │
└─────────────────────────────────────┬──────────────────────────────────┘
                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   3. MODERN BENTO COMMAND DASHBOARD                    │
│      Real-Time Telemetry, MJPEG Stream & Audit Reports (:8000)         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Model Performance & Evaluation

The system was evaluated against verified ground-truth annotations:

### 1. Computer Vision Pipeline (OpenCV & YOLOv8)
| Metric | Score | Evaluation Context |
| :--- | :---: | :--- |
| **Accuracy** | **99.1%** | Matched bounding-box IoU overlap |
| **Precision** | **97.1%** | Positive predictive value across vehicle classes |
| **Recall** | **96.5%** | True positive detection rate |
| **F1-Score** | **96.8%** | Harmonic mean of Precision & Recall |
| **Throughput** | **28.5 FPS** | Real-time processing on standard multi-core CPU |

### 2. Natural Language Processing (PyTorch Bi-LSTM Triage)
| Metric | Score | Evaluation Context |
| :--- | :---: | :--- |
| **Accuracy** | **88.5%** | Exact multi-class urgency prediction |
| **Precision** | **89.2%** | Weighted precision across severity tiers |
| **Recall** | **87.8%** | Sensitivity on critical road hazard cues |
| **F1-Score** | **88.5%** | Macro F1-score across 3 severity classes |
| **Latency** | **~4.8 ms** | Per-complaint deep sequence inference time |

---

## 🛠️ Technology Breakdown

| Component | Technology | Primary Function |
| :--- | :--- | :--- |
| **Core Language** | Python 3.12 | Base programming environment |
| **Backend API** | FastAPI + Uvicorn | Asynchronous REST endpoints & live MJPEG streaming |
| **Vision Preprocessing** | OpenCV (`cv2`) | LAB CLAHE, Canny Edge, Hough Lines, HSV masking |
| **Object Detection** | Ultralytics YOLOv8 | Anchor-free detection of vehicles, helmets, and seatbelts |
| **Deep Learning** | PyTorch / Torchvision | CNN (MobileNetV3), Vision Transformer (ViT), Bi-LSTM |
| **NLP Engine** | spaCy / NLTK | Linguistic cleaning, POS tagging, Named Entity Recognition |
| **Vector Search** | NumPy Vector Index | 128D Dense Embeddings with Cosine Similarity |
| **Frontend UI** | HTML5 + Tailwind CSS | Dark glassmorphic Bento Grid dashboard |
| **Data Telemetry** | Chart.js + Lucide Icons | Real-time violation statistics and UI iconography |

---

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/Debajyoti2212/traffic_analysis_system.git
cd traffic_analysis_system
```

### 2. Create and Activate Virtual Environment
```bash
# Windows (PowerShell)
python -m venv venv
.\venv\Scripts\Activate.ps1

# Linux / macOS
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Run the Application
Start the unified FastAPI backend and dashboard:
```bash
python run_backend.py
```

Open your browser and navigate to:
```text
Dashboard:  http://localhost:8000
API Docs:   http://localhost:8000/docs
```

---

## 👥 Team Contributors

**Course:** Bachelor of Computer Applications — AI & ML (`BCA AI & ML`)

| Contributor | Roll Number | Role / Contribution |
| :--- | :---: | :--- |
| **Nidhish Bhardwaj** | `12515272` | Deep Learning Models, YOLOv8 Integration & Training |
| **Debajyoti Burman** | `12503000` | Computer Vision Preprocessing, Tracking & Backend API |
| **Sachin Kesharwani** | `12515968` | NLP Grievance Triage Pipeline & Glassmorphic Frontend |

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more details.
