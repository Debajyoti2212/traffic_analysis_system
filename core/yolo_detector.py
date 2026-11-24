"""
TrafficAI - Computer Vision & Traffic Violation Detection Engine.
Integrates YOLOv8, CentroidTracker, Safety Rules, and EasyOCR ANPR.
"""

import os
import cv2
import time
import datetime
import logging
import re
import numpy as np
from typing import List, Dict, Tuple, Optional, Any, Set

os.environ["YOLO_CONFIG_DIR"] = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "models", "Ultralytics")
)

logger = logging.getLogger("TrafficYOLOEngine")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("[%(levelname)s] %(message)s"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


class CentroidTracker:
    """Tracks detected vehicles across consecutive frames using Euclidean distance."""

    def __init__(self, max_disappeared: int = 18, max_distance: float = 90.0):
        self.max_disappeared = max_disappeared
        self.max_distance = max_distance
        self.reset_session()

    def reset_session(self):
        """Clears tracking memory for a new session."""
        self.next_object_id = 1
        self.objects: Dict[int, Tuple[int, int]] = {}
        self.object_boxes: Dict[int, List[int]] = {}
        self.object_classes: Dict[int, str] = {}
        self.previous_boxes: Dict[int, List[int]] = {}
        self.disappeared: Dict[int, int] = {}
        self.session_counted_ids: Set[int] = set()
        self.unique_vehicle_counts = {
            "car": 0, "taxi": 0, "motorcycle": 0,
            "auto_rickshaw": 0, "bus": 0, "truck": 0, "total": 0
        }

    def _register(self, centroid: Tuple[int, int], bbox: List[int], cls_name: str) -> int:
        obj_id = self.next_object_id
        self.next_object_id += 1
        self.objects[obj_id] = centroid
        self.object_boxes[obj_id] = bbox
        self.object_classes[obj_id] = cls_name
        self.previous_boxes[obj_id] = bbox
        self.disappeared[obj_id] = 0

        if obj_id not in self.session_counted_ids:
            self.session_counted_ids.add(obj_id)
            if cls_name in self.unique_vehicle_counts:
                self.unique_vehicle_counts[cls_name] += 1
                self.unique_vehicle_counts["total"] += 1
        return obj_id

    def _deregister(self, obj_id: int):
        self.objects.pop(obj_id, None)
        self.object_boxes.pop(obj_id, None)
        self.object_classes.pop(obj_id, None)
        self.previous_boxes.pop(obj_id, None)
        self.disappeared.pop(obj_id, None)

    def update(self, detections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Matches current detections to tracked vehicles."""
        if not detections:
            for obj_id in list(self.disappeared.keys()):
                self.disappeared[obj_id] += 1
                if self.disappeared[obj_id] > self.max_disappeared:
                    self._deregister(obj_id)
            return []

        input_centroids = [
            (int((d["bbox"][0] + d["bbox"][2]) / 2.0), int((d["bbox"][1] + d["bbox"][3]) / 2.0))
            for d in detections
        ]

        if not self.objects:
            for i, (cx, cy) in enumerate(input_centroids):
                detections[i]["track_id"] = self._register((cx, cy), detections[i]["bbox"], detections[i]["class"])
            return detections

        obj_ids = list(self.objects.keys())
        obj_pts = list(self.objects.values())

        # Compute Euclidean distance matrix
        D = np.linalg.norm(np.array(obj_pts)[:, None] - np.array(input_centroids)[None, :], axis=2)
        rows = D.min(axis=1).argsort()
        cols = D.argmin(axis=1)[rows]

        used_rows, used_cols = set(), set()
        for r, c in zip(rows, cols):
            if r in used_rows or c in used_cols or D[r, c] > self.max_distance:
                continue
            obj_id = obj_ids[r]
            self.previous_boxes[obj_id] = self.object_boxes[obj_id]
            self.objects[obj_id] = input_centroids[c]
            self.object_boxes[obj_id] = detections[c]["bbox"]
            self.disappeared[obj_id] = 0
            cur_cls = detections[c]["class"]
            if cur_cls in self.unique_vehicle_counts:
                self.object_classes[obj_id] = cur_cls
            detections[c]["track_id"] = obj_id
            used_rows.add(r)
            used_cols.add(c)

        for r in set(range(len(obj_ids))) - used_rows:
            obj_id = obj_ids[r]
            self.disappeared[obj_id] += 1
            if self.disappeared[obj_id] > self.max_disappeared:
                self._deregister(obj_id)

        for c in set(range(len(input_centroids))) - used_cols:
            detections[c]["track_id"] = self._register(input_centroids[c], detections[c]["bbox"], detections[c]["class"])

        return detections


class TrafficYOLODetector:
    """Main CV detector integrating YOLOv8, CentroidTracker, Safety Rules, and EasyOCR."""

    def __init__(self, snapshots_dir: str = None):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.snapshots_dir = snapshots_dir or os.path.join(base_dir, "snapshots")
        self.models_dir = os.path.join(base_dir, "models")
        os.makedirs(self.snapshots_dir, exist_ok=True)

        self.model = None
        self.helmet_model = None
        self.plate_model = None
        self.ocr_reader = None
        self._init_models()

        self.tracker = CentroidTracker()
        self.current_session_id = f"SES-{int(time.time())}"
        self.logged_event_keys: Set[str] = set()
        self.total_violations_logged = 0
        self.violation_history = []
        self.total_frames_processed = 0

        self.violation_type_counts = {
            "NO_HELMET": 0, "NO_SEATBELT": 0, "OVERLOADING": 0,
            "RED_LIGHT_JUMP": 0, "WRONG_WAY": 0, "STALLED_SPEED": 0
        }
        self.anpr_stats = {"plates_recognized": 0, "plates_unreadable": 0}
        self.recent_fps_history = [25.0] * 10
        self.current_fps = 25.0
        self.current_latency_ms = 12.0
        self.last_signal_state = "GREEN"
        self.last_density = "MODERATE"

    def reset_stats(self, new_session_id: Optional[str] = None):
        """Resets tracking counters for a new session."""
        self.tracker.reset_session()
        self.logged_event_keys.clear()
        self.current_session_id = new_session_id or f"SES-{int(time.time())}"
        self.total_violations_logged = 0
        self.violation_history.clear()
        self.total_frames_processed = 0
        for k in self.violation_type_counts:
            self.violation_type_counts[k] = 0
        self.anpr_stats["plates_recognized"] = 0
        self.anpr_stats["plates_unreadable"] = 0
        self.recent_fps_history = [25.0] * 10
        logger.info(f"Session reset: {self.current_session_id}")

    def _init_models(self):
        """Loads YOLO weights and EasyOCR reader."""
        try:
            from ultralytics import YOLO
            for attr, filename in [("model", "yolov8n.pt"), ("helmet_model", "helmet_detector.pt"), ("plate_model", "license_plate_detector.pt")]:
                weights = os.path.join(self.models_dir, filename)
                if not os.path.exists(weights) and filename == "yolov8n.pt":
                    weights = "yolov8n.pt"
                if os.path.exists(weights):
                    setattr(self, attr, YOLO(weights))
                    logger.info(f"Loaded {attr}: {weights}")
        except Exception as e:
            logger.warning(f"YOLO load warning: {e}")

        try:
            import easyocr
            storage = os.path.join(self.models_dir, "EasyOCR")
            os.makedirs(storage, exist_ok=True)
            self.ocr_reader = easyocr.Reader(['en'], gpu=False, model_storage_directory=storage, download_enabled=False)
            logger.info("Initialized EasyOCR offline reader.")
        except Exception as e:
            logger.warning(f"EasyOCR reader init warning: {e}")

    def detect_traffic_light_state(self, frame: np.ndarray, light_roi: Optional[Tuple[int, int, int, int]] = None) -> Dict[str, Any]:
        """Analyzes traffic light color using HSV color thresholding."""
        h, w = frame.shape[:2]
        rx, ry, rw, rh = light_roi or (int(w * 0.78), int(h * 0.05), int(w * 0.18), int(h * 0.28))
        rx, ry = max(0, min(w - 1, rx)), max(0, min(h - 1, ry))
        rw, rh = max(1, min(w - rx, rw)), max(1, min(h - ry, rh))

        crop = frame[ry:ry+rh, rx:rx+rw]
        if crop.size == 0:
            return {"state": "GREEN", "confidence": 0.85, "roi": (rx, ry, rw, rh)}

        hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
        r1 = cv2.inRange(hsv, np.array([0, 70, 70]), np.array([10, 255, 255]))
        r2 = cv2.inRange(hsv, np.array([160, 70, 70]), np.array([180, 255, 255]))
        red_px = cv2.countNonZero(r1 | r2)
        green_px = cv2.countNonZero(cv2.inRange(hsv, np.array([40, 70, 70]), np.array([90, 255, 255])))

        state = "RED" if (red_px > green_px and red_px > 35) else "GREEN"
        conf = 0.92 if (red_px > 35 or green_px > 35) else 0.75
        return {"state": state, "confidence": conf, "red_pixels": red_px, "green_pixels": green_px, "roi": (rx, ry, rw, rh)}

    def _refine_vehicle_class(self, frame: np.ndarray, bbox: List[int], raw_cls: str) -> str:
        """Distinguishes auto-rickshaws and taxis from standard cars and trucks."""
        if raw_cls not in ["car", "truck", "bus"]:
            return raw_cls
        x1, y1, x2, y2 = bbox
        crop = frame[max(0, y1):min(frame.shape[0], y2), max(0, x1):min(frame.shape[1], x2)]
        if crop.size == 0:
            return raw_cls

        ch, cw = crop.shape[:2]
        aspect = float(cw) / max(1.0, float(ch))
        crop_hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)

        # Check for auto-rickshaw (aspect ratio 0.40 - 1.85 and green/yellow canopy)
        if 0.40 <= aspect <= 1.85 and (cw * ch) < (0.45 * frame.shape[0] * frame.shape[1]):
            m_green = cv2.inRange(crop_hsv, np.array([35, 40, 35]), np.array([88, 255, 255]))
            m_yellow = cv2.inRange(crop_hsv, np.array([16, 65, 65]), np.array([35, 255, 255]))
            if (cv2.countNonZero(m_green | m_yellow) / float(cw * ch)) > 0.11:
                return "auto_rickshaw"

        # Check for taxi (yellow roof on car)
        if raw_cls == "car":
            roof = crop_hsv[0:max(1, int(ch * 0.35)), :]
            m_taxi = cv2.inRange(roof, np.array([16, 80, 80]), np.array([35, 255, 255]))
            if (cv2.countNonZero(m_taxi) / float(roof.shape[0] * roof.shape[1])) > 0.18:
                return "taxi"

        return raw_cls

    def _check_seatbelt(self, frame: np.ndarray, bbox: List[int], v_cls: str) -> str:
        """Verifies driver seatbelt compliance for cars/taxis. Buses/trucks/autos are excluded."""
        if v_cls not in ["car", "taxi"]:
            return ""
        x1, y1, x2, y2 = bbox
        w, h = x2 - x1, y2 - y1
        if w < 85 or h < 75:
            return ""

        cabin = frame[max(0, y1):min(frame.shape[0], y1 + int(h * 0.52)), max(0, x1):min(frame.shape[1], x2)]
        if cabin.size == 0:
            return ""

        # Check if driver occupant is visible via skin tone detection
        ycrcb = cv2.cvtColor(cabin, cv2.COLOR_BGR2YCrCb)
        skin = cv2.inRange(ycrcb, np.array([0, 133, 77]), np.array([255, 173, 127]))
        if cv2.countNonZero(skin) <= 180:
            return ""

        # Search for diagonal 3-point seatbelt line
        gray = cv2.cvtColor(cabin, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8)).apply(gray)
        lines = cv2.HoughLinesP(cv2.Canny(clahe, 50, 150), 1, np.pi / 180, 25, minLineLength=25, maxLineGap=10)

        has_strap = False
        if lines is not None:
            for l in lines:
                x_1, y_1, x_2, y_2 = l[0] if (hasattr(l, "__len__") and len(l) == 1) else l
                angle = np.degrees(np.arctan2(abs(float(y_2) - float(y_1)), max(1.0, abs(float(x_2) - float(x_1)))))
                if 28 <= angle <= 65:
                    has_strap = True
                    break

        if np.mean(gray) > 70 and not has_strap:
            return "no_seatbelt"
        return "seatbelt_on" if has_strap else ""

    def detect_objects(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """Runs YOLOv8 object detection and verifies helmet, seatbelt, and overloading."""
        h, w = frame.shape[:2]
        detections, raw_persons, raw_motos, raw_vehicles = [], [], [], []

        if self.model is not None:
            try:
                results = self.model(frame, verbose=False, conf=0.28)[0]
                for box in results.boxes:
                    cls_name = self.model.names.get(int(box.cls[0]), "unknown")
                    conf = float(box.conf[0])
                    xyxy = box.xyxy[0].cpu().numpy().astype(int).tolist()
                    clipped = [max(0, xyxy[0]), max(0, xyxy[1]), min(w, xyxy[2]), min(h, xyxy[3])]

                    if cls_name == "person":
                        raw_persons.append({"bbox": clipped, "conf": conf})
                    elif cls_name == "motorcycle":
                        raw_motos.append({"bbox": clipped, "conf": conf, "class": "motorcycle"})
                    elif cls_name in ["car", "bus", "truck"]:
                        v_type = self._refine_vehicle_class(frame, clipped, cls_name)
                        raw_vehicles.append({"bbox": clipped, "conf": conf, "class": v_type})
            except Exception as e:
                logger.error(f"YOLO error: {e}")

        used_persons = set()

        # 1. Process motorcycles: helmet & overloading
        for moto in raw_motos:
            mx1, my1, mx2, my2 = moto["bbox"]
            mw, mh = mx2 - mx1, my2 - my1
            mcx = int((mx1 + mx2) / 2.0)

            riders = [
                (i, p) for i, p in enumerate(raw_persons)
                if i not in used_persons and abs(int((p["bbox"][0] + p["bbox"][2]) / 2.0) - mcx) < (mw * 0.72)
                and (p["bbox"][3] >= my1) and (p["bbox"][1] < my1 + int(mh * 0.85))
            ]

            compliance = ""
            rider_count = len(riders)
            if rider_count > 2:
                compliance = "overloading"
                for i, _ in riders:
                    used_persons.add(i)
            elif rider_count >= 1:
                p_idx, primary = riders[0]
                used_persons.add(p_idx)
                head_crop = frame[max(0, primary["bbox"][1]):min(h, primary["bbox"][1] + int((primary["bbox"][3] - primary["bbox"][1]) * 0.45)), max(0, primary["bbox"][0]):min(w, primary["bbox"][2])]
                has_helmet = True
                if head_crop.size > 0 and self.helmet_model is not None:
                    try:
                        h_res = self.helmet_model(head_crop, verbose=False, conf=0.30)[0]
                        for hb in h_res.boxes:
                            name = self.helmet_model.names.get(int(hb.cls[0]), "").lower()
                            if "without" in name:
                                has_helmet = False
                                break
                    except Exception:
                        pass
                compliance = "with_helmet" if has_helmet else "without_helmet"

            detections.append({
                "class": "motorcycle", "bbox": moto["bbox"], "confidence": moto["conf"],
                "vehicle_type": "motorcycle", "compliance": compliance, "rider_count": rider_count
            })

        # 2. Process four-wheelers & auto-rickshaws
        for veh in raw_vehicles:
            compliance = self._check_seatbelt(frame, veh["bbox"], veh["class"])
            detections.append({
                "class": veh["class"], "bbox": veh["bbox"], "confidence": veh["conf"],
                "vehicle_type": veh["class"], "compliance": compliance
            })

        # 3. Pedestrians
        for i, p in enumerate(raw_persons):
            if i not in used_persons:
                detections.append({
                    "class": "pedestrian", "bbox": p["bbox"], "confidence": p["conf"],
                    "vehicle_type": "pedestrian", "compliance": ""
                })

        return detections

    def _recognize_license_plate(self, frame: np.ndarray, vehicle_bbox: List[int], v_id: str) -> Tuple[str, float, str]:
        """Extracts plate crop and runs EasyOCR. Never returns fake plate text."""
        x1, y1, x2, y2 = vehicle_bbox
        veh_crop = frame[max(0, y1):min(frame.shape[0], y2), max(0, x1):min(frame.shape[1], x2)]
        plate_file = f"{v_id}_plate.jpg"
        save_path = os.path.join(self.snapshots_dir, plate_file)

        if veh_crop.size == 0:
            return "Number Plate Not Readable", 0.0, ""

        plate_crop = None
        vh, vw = veh_crop.shape[:2]

        if self.plate_model is not None and vh >= 16 and vw >= 16:
            try:
                p_res = self.plate_model(veh_crop, verbose=False, conf=0.12)[0]
                if len(p_res.boxes) > 0:
                    best = max(p_res.boxes, key=lambda b: float(b.conf[0]))
                    px1, py1, px2, py2 = best.xyxy[0].cpu().numpy().astype(int)
                    pad_w, pad_h = max(4, int((px2 - px1) * 0.12)), max(4, int((py2 - py1) * 0.12))
                    plate_crop = veh_crop[max(0, py1 - pad_h):min(vh, py2 + pad_h), max(0, px1 - pad_w):min(vw, px2 + pad_w)].copy()
            except Exception:
                pass

        if plate_crop is None or plate_crop.size == 0:
            plate_crop = veh_crop[int(vh * 0.65):vh, int(vw * 0.10):int(vw * 0.90)].copy()

        if plate_crop is None or plate_crop.size == 0:
            return "Number Plate Not Readable", 0.0, ""

        cv2.imwrite(save_path, plate_crop)
        ph, pw = plate_crop.shape[:2]
        if ph < 8 or pw < 16:
            self.anpr_stats["plates_unreadable"] += 1
            return "Number Plate Not Readable", 0.0, plate_file

        scale = max(2.5, 75.0 / float(ph))
        enhanced = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8)).apply(
            cv2.cvtColor(cv2.resize(plate_crop, (int(pw * scale), int(ph * scale)), interpolation=cv2.INTER_CUBIC), cv2.COLOR_BGR2GRAY)
        )
        _, thresh = cv2.threshold(cv2.GaussianBlur(enhanced, (3, 3), 0), 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        plate_text, ocr_conf = "", 0.0
        if self.ocr_reader is not None:
            try:
                ocr_results = self.ocr_reader.readtext(enhanced, allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ') or \
                              self.ocr_reader.readtext(thresh, allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ')
                candidates = [
                    (re.sub(r'[^A-Z0-9]', '', r[1].strip().upper()), float(r[2]))
                    for r in ocr_results if len(re.sub(r'[^A-Z0-9]', '', r[1].strip().upper())) >= 3
                ]
                if candidates:
                    candidates.sort(key=lambda x: x[1], reverse=True)
                    plate_text, ocr_conf = candidates[0]
            except Exception:
                pass

        if plate_text and ocr_conf >= 0.35 and any(c.isalpha() for c in plate_text) and any(c.isdigit() for c in plate_text):
            self.anpr_stats["plates_recognized"] += 1
            return plate_text, round(ocr_conf, 2), plate_file

        self.anpr_stats["plates_unreadable"] += 1
        return "Number Plate Not Readable", round(ocr_conf, 2) if ocr_conf > 0 else 0.0, plate_file

    def _log_violation(self, frame: np.ndarray, bbox: List[int], v_type: str, vehicle_cls: str,
                       track_id: int, session_id: str, junction: str, conf: float, desc: str) -> Dict[str, Any]:
        """Creates official e-Challan record with clean vehicle evidence and plate crops."""
        self.total_violations_logged += 1
        self.violation_type_counts[v_type] = self.violation_type_counts.get(v_type, 0) + 1

        now = datetime.datetime.now()
        v_id = f"CHALLAN-{now.strftime('%Y%m%d%H%M%S')}-{self.total_violations_logged}"
        plate_number, ocr_conf, plate_crop_file = self._recognize_license_plate(frame, bbox, v_id)

        # Save clean full vehicle evidence image with 18% padding
        x1, y1, x2, y2 = bbox
        h, w = frame.shape[:2]
        pad_x, pad_y = max(20, int((x2 - x1) * 0.18)), max(20, int((y2 - y1) * 0.18))
        veh_crop = frame[max(0, y1 - pad_y):min(h, y2 + pad_y), max(0, x1 - pad_x):min(w, x2 + pad_x)].copy()
        veh_filename = f"{v_id}_vehicle.jpg"
        cv2.imwrite(os.path.join(self.snapshots_dir, veh_filename), veh_crop)

        record = {
            "challan_id": v_id, "session_id": session_id, "track_id": track_id,
            "vehicle_type": vehicle_cls, "violation_type": v_type, "violation_description": desc,
            "junction": junction, "timestamp": now.strftime("%Y-%m-%d %H:%M:%S"),
            "confidence": round(float(conf), 2), "plate_number": plate_number, "ocr_confidence": ocr_conf,
            "snapshot_file": veh_filename, "plate_crop_file": plate_crop_file,
            "fine_amount_inr": None, "review_status": "Needs review"
        }
        self.violation_history.append(record)
        return record

    def process_frame(self, frame: np.ndarray, stop_line: Tuple[int, int, int, int],
                      light_state: str = "GREEN", junction_name: str = "Sector 14 Smart Junction",
                      session_id: Optional[str] = None) -> Dict[str, Any]:
        """Processes frame: detection, tracking, safety violations, e-Challan capture, and annotations."""
        t0 = time.perf_counter()
        active_session = session_id or self.current_session_id
        detections = self.tracker.update(self.detect_objects(frame))
        stop_line_y = stop_line[1]

        annotated_frame = frame.copy()
        violations_in_frame = []
        line_col = (0, 0, 255) if light_state == "RED" else (0, 255, 0)
        cv2.line(annotated_frame, (stop_line[0], stop_line[1]), (stop_line[2], stop_line[3]), line_col, 3)
        cv2.putText(annotated_frame, f"VIRTUAL STOP-LINE [{light_state}]", (20, max(25, stop_line_y - 12)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, line_col, 2, cv2.LINE_AA)

        counts = {"car": 0, "taxi": 0, "motorcycle": 0, "auto_rickshaw": 0, "bus": 0, "truck": 0, "pedestrian": 0, "total_vehicles": 0}
        compliance_counts = {"with_helmet": 0, "without_helmet": 0, "seatbelt_on": 0, "no_seatbelt": 0, "overloading": 0}

        for det in detections:
            cls_name, bbox, conf, track_id = det["class"], det["bbox"], det["confidence"], det.get("track_id", 0)
            x1, y1, x2, y2 = bbox
            if cls_name in counts:
                counts[cls_name] += 1
                if cls_name != "pedestrian":
                    counts["total_vehicles"] += 1

            comp = det.get("compliance", "")
            if comp in compliance_counts:
                compliance_counts[comp] += 1

            # Violation checks
            v_type, desc = None, None
            if cls_name != "pedestrian" and light_state == "RED":
                prev_bbox = self.tracker.previous_boxes.get(track_id)
                if prev_bbox and prev_bbox[3] <= (stop_line_y + 5) and y2 > stop_line_y and y2 > prev_bbox[3]:
                    v_type, desc = "RED_LIGHT_JUMP", "Vehicle crossed virtual stop-line during active RED signal"
            elif cls_name == "motorcycle" and comp == "without_helmet":
                v_type, desc = "NO_HELMET", "Motorcycle rider operating vehicle without protective helmet"
            elif cls_name == "motorcycle" and comp == "overloading":
                v_type, desc = "OVERLOADING", f"Overloading violation - {det.get('rider_count', 3)} riders on two-wheeler"
            elif cls_name in ["car", "taxi"] and comp == "no_seatbelt":
                v_type, desc = "NO_SEATBELT", f"Front occupant of {cls_name} observed without seatbelt"

            if v_type:
                event_key = f"{active_session}_{track_id}_{v_type}"
                if event_key not in self.logged_event_keys:
                    self.logged_event_keys.add(event_key)
                    violations_in_frame.append(
                        self._log_violation(frame, bbox, v_type, cls_name, track_id, active_session, junction_name, conf, desc)
                    )

            # Draw visual bounding box and label
            has_viol = bool(v_type) or (comp in ["without_helmet", "no_seatbelt", "overloading"])
            box_col = (0, 0, 255) if has_viol else ((255, 200, 0) if cls_name == "pedestrian" else (0, 255, 0))
            label = f"#{track_id} {cls_name} {int(conf * 100)}%" + (f" | {comp}" if comp else "")
            cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), box_col, 2)
            cv2.putText(annotated_frame, label, (x1 + 3, max(15, y1 - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)

        # Vehicle density and dynamic green timer recommendation
        v_total = counts["total_vehicles"]
        density, green_sec = ("LOW", 25) if v_total < 3 else (("MODERATE", 45) if v_total <= 6 else ("HIGH (GRIDLOCK RISK)", 75))

        latency_ms = round((time.perf_counter() - t0) * 1000, 2)
        fps = round(1000.0 / max(latency_ms, 1.0), 1)
        self.total_frames_processed += 1
        self.current_fps, self.current_latency_ms, self.last_signal_state, self.last_density = fps, latency_ms, light_state, density
        self.recent_fps_history.append(fps)
        if len(self.recent_fps_history) > 15:
            self.recent_fps_history.pop(0)

        return {
            "annotated_frame": annotated_frame,
            "vehicle_counts": counts,
            "session_unique_vehicle_counts": dict(self.tracker.unique_vehicle_counts),
            "compliance_counts": compliance_counts,
            "traffic_density": density,
            "recommended_green_timer_sec": green_sec,
            "violations": violations_in_frame,
            "latency_ms": latency_ms,
            "fps": fps
        }

    def update_violation_status(self, challan_id: str, new_status: str) -> bool:
        """Updates human-in-the-loop review status (Needs review, Confirmed, Dismissed)."""
        fine_map = {"NO_HELMET": 1000, "NO_SEATBELT": 2000, "OVERLOADING": 2000, "RED_LIGHT_JUMP": 5000, "WRONG_WAY": 5000, "STALLED_SPEED": 1000}
        for v in self.violation_history:
            if v.get("challan_id") == challan_id:
                v["review_status"] = new_status
                v["fine_amount_inr"] = fine_map.get(v.get("violation_type"), 1000) if new_status == "Confirmed" else 0
                return True
        return False

    def get_live_analytics(self) -> Dict[str, Any]:
        """Returns summarized traffic and violation analytics for dashboard charts."""
        uv = dict(self.tracker.unique_vehicle_counts)
        tot = uv.get("total", 0)
        tw = uv.get("motorcycle", 0)
        fw = tot - tw
        total_viol = sum(self.violation_type_counts.values())

        return {
            "session_id": self.current_session_id,
            "total_frames_processed": self.total_frames_processed,
            "total_vehicles": tot,
            "vehicle_breakdown": uv,
            "two_wheelers_count": tw,
            "four_wheelers_count": fw,
            "two_wheelers_pct": round((tw / tot) * 100, 1) if tot > 0 else 0.0,
            "four_wheelers_pct": round((fw / tot) * 100, 1) if tot > 0 else 0.0,
            "total_violations": total_viol,
            "violation_rate_pct": min(100.0, round((total_viol / tot) * 100, 1) if tot > 0 else 0.0),
            "fps": self.current_fps,
            "latency_ms": self.current_latency_ms,
            "fps_history": list(self.recent_fps_history)[-10:],
            "violations_breakdown": dict(self.violation_type_counts),
            "anpr_stats": dict(self.anpr_stats),
            "challan_status_counts": {
                "pending_review": sum(1 for v in self.violation_history if v.get("review_status") == "Needs review"),
                "approved": sum(1 for v in self.violation_history if v.get("review_status") == "Confirmed"),
                "dismissed": sum(1 for v in self.violation_history if v.get("review_status") == "Dismissed")
            },
            "density": self.last_density,
            "signal_state": self.last_signal_state
        }
