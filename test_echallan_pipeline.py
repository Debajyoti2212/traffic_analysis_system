import os
import cv2
import sys
from core.yolo_detector import TrafficYOLODetector
from core.cv_preprocessor import TrafficCVPreprocessor

def run_test():
    video_path = "uploads/traffic_upload_1795365048.mp4"
    if not os.path.exists(video_path):
        video_path = "sample_video/intersection_demo.mp4"

    print(f"=== TESTING E-CHALLAN PIPELINE ON: {video_path} ===")
    detector = TrafficYOLODetector()
    preprocessor = TrafficCVPreprocessor()

    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"Total video frames: {total_frames}")

    frame_idx = 0
    max_frames = min(150, total_frames)

    while cap.isOpened() and frame_idx < max_frames:
        ret, frame = cap.read()
        if not ret or frame is None:
            break
        frame_idx += 1

        _, stop_line, _ = preprocessor.detect_stop_line_and_lanes(frame)
        light_state = detector.detect_traffic_light_state(frame)["state"]

        detector.process_frame(
            frame=frame,
            stop_line=stop_line,
            light_state=light_state,
            session_id="VERIFY_SES_99"
        )

    cap.release()

    print("\n" + "=" * 70)
    print("VERIFICATION & VALIDATION TEST RESULTS:")
    print("=" * 70)

    violations = detector.violation_history
    print(f"Total Candidate Violations Logged: {len(violations)}")

    # Test 1: Check Bus & Truck Seatbelt
    bus_truck_seatbelt = [v for v in violations if v["vehicle_type"] in ["bus", "truck"] and v["violation_type"] == "NO_SEATBELT"]
    test1_pass = len(bus_truck_seatbelt) == 0
    print(f"Test 1 [Bus/Truck NO_SEATBELT violations]: {'PASSED' if test1_pass else 'FAILED'} ({len(bus_truck_seatbelt)} detected)")

    # Test 2: Check Auto Rickshaw Seatbelt
    auto_seatbelt = [v for v in violations if v["vehicle_type"] == "auto_rickshaw" and v["violation_type"] == "NO_SEATBELT"]
    test2_pass = len(auto_seatbelt) == 0
    print(f"Test 2 [Auto Rickshaw NO_SEATBELT excluded]: {'PASSED' if test2_pass else 'FAILED'} ({len(auto_seatbelt)} detected)")

    # Test 3: Check Vehicle Evidence Image exists & size
    veh_images_pass = True
    plate_images_pass = True
    ocr_valid_pass = True
    review_status_pass = True

    for i, v in enumerate(violations):
        v_img = os.path.join(detector.snapshots_dir, v["snapshot_file"])
        p_img = os.path.join(detector.snapshots_dir, v["plate_crop_file"])

        v_ok = os.path.exists(v_img) and os.path.getsize(v_img) > 0
        p_ok = os.path.exists(p_img) and os.path.getsize(p_img) > 0
        if not v_ok:
            veh_images_pass = False
        if not p_ok:
            plate_images_pass = False

        # Verify plate text is not fake
        plate_str = v["plate_number"]
        ocr_c = v["ocr_confidence"]
        if "DL 01" in plate_str or "DL01" in plate_str:
            ocr_valid_pass = False

        if v["review_status"] != "Needs review" or v["fine_amount_inr"] is not None:
            review_status_pass = False

        print(f"\nChallan #{i+1}:")
        print(f"  Notice ID:       {v['challan_id']}")
        print(f"  Vehicle Track:   #{v['track_id']} [{v['vehicle_type'].upper()}]")
        print(f"  Violation:       {v['violation_type']}")
        print(f"  Plate Text:      {plate_str}")
        print(f"  OCR Confidence:  {ocr_c}")
        print(f"  Vehicle Image:   {'EXISTS (' + str(os.path.getsize(v_img)) + ' bytes)' if v_ok else 'MISSING!'}")
        print(f"  Plate Crop:      {'EXISTS (' + str(os.path.getsize(p_img)) + ' bytes)' if p_ok else 'MISSING!'}")
        print(f"  Review Status:   {v['review_status']} (Fine Pending: {v['fine_amount_inr'] is None})")

    print("\n" + "=" * 70)
    print(f"Test 3 [Full Vehicle Evidence Images Saved & Valid]: {'PASSED' if veh_images_pass else 'FAILED'}")
    print(f"Test 4 [Dedicated Number Plate Crops Saved & Valid]: {'PASSED' if plate_images_pass else 'FAILED'}")
    print(f"Test 5 [No Fake Plate Numbers Generated]: {'PASSED' if ocr_valid_pass else 'FAILED'}")
    print(f"Test 6 [Review Status 'Needs review' & Fine Pending]: {'PASSED' if review_status_pass else 'FAILED'}")
    print("=" * 70)

if __name__ == "__main__":
    run_test()
