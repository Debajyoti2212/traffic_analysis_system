"""
Generates a realistic synthetic Indian intersection CCTV surveillance video clip.
Features:
- Multi-lane road asphalt with lane markings and virtual stop-line.
- Traffic light post cycling RED and GREEN.
- Multi-class vehicles: Cars, Motorcycles (with and without helmets), Buses, Trucks, and an Ambulance.
- Red-light violation event: a car crossing the stop line while the light is RED.
- Pothole defect on the road.
Output: sample_video/intersection_demo.mp4
"""
import os
import cv2
import numpy as np

def create_synthetic_intersection_video(output_path: str = "sample_video/intersection_demo.mp4", num_frames: int = 300, fps: int = 25):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    w, h = 640, 480
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (w, h))

    stop_line_y = int(h * 0.65) # Y = 312

    # Vehicles state definitions: [type, x, y, speed, compliance, color]
    # Y speeds move downwards (towards camera perspective)
    vehicles = [
        {"type": "car", "x": 120, "y": 60, "vy": 4, "w": 65, "h": 90, "color": (40, 40, 200), "compliance": "seatbelt_on", "violates_red": False},
        {"type": "motorcycle", "x": 230, "y": 20, "vy": 5, "w": 30, "h": 50, "color": (180, 50, 50), "compliance": "without_helmet", "violates_red": False},
        {"type": "bus", "x": 340, "y": -40, "vy": 3, "w": 90, "h": 140, "color": (50, 180, 50), "compliance": "seatbelt_on", "violates_red": False},
        {"type": "car", "x": 480, "y": 140, "vy": 6, "w": 65, "h": 90, "color": (220, 220, 40), "compliance": "no_seatbelt", "violates_red": True},
        {"type": "motorcycle", "x": 180, "y": -120, "vy": 5, "w": 30, "h": 50, "color": (150, 150, 20), "compliance": "with_helmet", "violates_red": False},
        {"type": "truck", "x": 70, "y": -220, "vy": 3, "w": 85, "h": 130, "color": (120, 120, 120), "compliance": "seatbelt_on", "violates_red": False},
        {"type": "ambulance", "x": 260, "y": -320, "vy": 7, "w": 75, "h": 110, "color": (245, 245, 245), "compliance": "seatbelt_on", "is_emergency": True}
    ]

    for frame_idx in range(num_frames):
        # Base Road Canvas (Dark Asphalt)
        frame = np.full((h, w, 3), (45, 48, 52), dtype=np.uint8)

        # Sidewalks / Curbs
        cv2.rectangle(frame, (0, 0), (50, h), (90, 95, 100), -1)
        cv2.rectangle(frame, (590, 0), (w, h), (90, 95, 100), -1)

        # Lane dividers (Dashed white lines)
        dash_offset = (frame_idx * 4) % 40
        for lx in [190, 320, 450]:
            for y_start in range(-40 + dash_offset, h, 40):
                cv2.line(frame, (lx, y_start), (lx, min(h, y_start + 20)), (230, 230, 230), 2)

        # Stop-Line (White bar across lanes)
        cv2.line(frame, (50, stop_line_y), (590, stop_line_y), (255, 255, 255), 4)

        # Zebra Crosswalk stripes below stop line
        for zx in range(60, 580, 40):
            cv2.rectangle(frame, (zx, stop_line_y + 10), (zx + 22, stop_line_y + 40), (220, 220, 220), -1)

        # Pothole Defect on road (at x=220, y=410)
        cv2.ellipse(frame, (220, 410), (28, 14), 10, 0, 360, (20, 22, 25), -1)
        cv2.ellipse(frame, (220, 410), (28, 14), 10, 0, 360, (70, 75, 80), 2)

        # Traffic Signal Light Cycle:
        # Frames 0-140: GREEN (5.6s)
        # Frames 141-260: RED (4.8s)
        # Frames 261+: GREEN
        is_red_light = 140 <= frame_idx <= 260
        signal_state = "RED" if is_red_light else "GREEN"

        # Draw Traffic Light Post (Upper Right)
        pole_x, pole_y = 595, 30
        cv2.rectangle(frame, (pole_x, pole_y), (pole_x + 35, pole_y + 90), (25, 25, 25), -1)
        cv2.rectangle(frame, (pole_x, pole_y), (pole_x + 35, pole_y + 90), (100, 100, 100), 2)
        
        # Red lamp
        red_color = (0, 0, 255) if is_red_light else (0, 0, 70)
        cv2.circle(frame, (pole_x + 17, pole_y + 22), 11, red_color, -1)
        # Yellow lamp
        cv2.circle(frame, (pole_x + 17, pole_y + 46), 11, (0, 70, 70), -1)
        # Green lamp
        green_color = (0, 255, 0) if not is_red_light else (0, 70, 0)
        cv2.circle(frame, (pole_x + 17, pole_y + 70), 11, green_color, -1)

        # Update and Render Vehicles
        for v in vehicles:
            vx, vy = v["x"], int(v["y"])
            vw, vh = v["w"], v["h"]

            # If red light is ON and vehicle does not deliberately violate, stop before stop line
            should_stop = is_red_light and not v.get("violates_red", False) and (stop_line_y - 120 <= vy + vh <= stop_line_y)

            if not should_stop:
                v["y"] += v["vy"]
                if v["y"] > h + 100:
                    v["y"] = -150 - np.random.randint(10, 100)

            # Draw vehicle body if in frame
            if -vh < vy < h + 50:
                color = v["color"]
                cv2.rectangle(frame, (vx, vy), (vx + vw, vy + vh), color, -1)
                cv2.rectangle(frame, (vx, vy), (vx + vw, vy + vh), (255, 255, 255), 2)

                # Windshield for cars/buses
                if v["type"] in ["car", "bus", "truck", "ambulance"]:
                    cv2.rectangle(frame, (vx + 8, vy + int(vh * 0.2)), (vx + vw - 8, vy + int(vh * 0.4)), (180, 200, 220), -1)

                # Ambulance emergency markings & siren
                if v.get("is_emergency", False):
                    # Red cross
                    cx, cy = vx + vw // 2, vy + int(vh * 0.65)
                    cv2.line(frame, (cx - 12, cy), (cx + 12, cy), (0, 0, 255), 4)
                    cv2.line(frame, (cx, cy - 12), (cx, cy + 12), (0, 0, 255), 4)
                    # Flashing siren
                    siren_color = (0, 0, 255) if (frame_idx % 6 < 3) else (255, 255, 0)
                    cv2.circle(frame, (cx, vy + 6), 6, siren_color, -1)

                # Motorcycle rider
                if v["type"] == "motorcycle":
                    head_center = (vx + vw // 2, vy + 12)
                    head_color = (50, 150, 240) if v["compliance"] == "with_helmet" else (80, 180, 220) # Head / Helmet
                    cv2.circle(frame, head_center, 9, head_color, -1)
                    if v["compliance"] == "without_helmet":
                        cv2.circle(frame, head_center, 8, (60, 110, 180), -1) # Unprotected hair

        # Telemetry HUD on top left
        cv2.putText(frame, f"CAM-04 | SECTOR 14 JUNCTION | FRAME: {frame_idx:04d}", (15, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 2)
        cv2.putText(frame, f"SIGNAL: {signal_state}", (15, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255) if is_red_light else (0, 255, 0), 2)

        out.write(frame)

    out.release()
    print(f"Sample intersection video generated successfully: {output_path} ({num_frames} frames)")

if __name__ == "__main__":
    create_synthetic_intersection_video()
