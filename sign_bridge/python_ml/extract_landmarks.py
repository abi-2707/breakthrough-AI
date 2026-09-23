"""
BREAK THROUGH AI — Sign Language Communication Bridge
Hand Landmark Extraction Service (Python)
Extracts 21 3D landmarks for up to 2 hands from static images or live webcam streams.
Outputs normalized feature vectors (126 features: 21 landmarks x 3 coords x 2 hands).
"""

import cv2
import mediapipe as mp
import numpy as np
import json
import os
import argparse

mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

NUM_HANDS = 2
NUM_LANDMARKS_PER_HAND = 21
NUM_COORDS = 3 # x, y, z
TOTAL_FEATURES_PER_FRAME = NUM_HANDS * NUM_LANDMARKS_PER_HAND * NUM_COORDS # 126

class HandLandmarkExtractor:
    def __init__(self, static_image_mode=False, max_num_hands=2, min_detection_confidence=0.7, min_tracking_confidence=0.5):
        self.hands = mp_hands.Hands(
            static_image_mode=static_image_mode,
            max_num_hands=max_num_hands,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence
        )

    def extract_landmarks(self, frame_bgr):
        """
        Process a single BGR image/frame and return:
        1. feature_vector: 1D numpy array of shape (126,) normalized relative to wrist
        2. raw_results: original MediaPipe multi_hand_landmarks object
        """
        # Convert BGR to RGB
        image_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        image_rgb.flags.writeable = False
        results = self.hands.process(image_rgb)
        image_rgb.flags.writeable = True

        features = np.zeros(TOTAL_FEATURES_PER_FRAME, dtype=np.float32)

        if not results.multi_hand_landmarks:
            return features, results

        # Sort hands deterministically (e.g. left-to-right based on wrist X)
        hands_data = []
        for hand_landmarks, handedness in zip(results.multi_hand_landmarks, results.multi_handedness):
            label = handedness.classification[0].label # 'Left' or 'Right'
            wrist = hand_landmarks.landmark[0]
            hands_data.append({
                'label': label,
                'wrist_x': wrist.x,
                'landmarks': hand_landmarks.landmark
            })

        # Sort by wrist_x (left hand on screen appears first)
        hands_data.sort(key=lambda h: h['wrist_x'])

        offset = 0
        for h_idx in range(min(len(hands_data), NUM_HANDS)):
            hand = hands_data[h_idx]['landmarks']
            wrist_x = hand[0].x
            wrist_y = hand[0].y
            wrist_z = hand[0].z

            for lm in hand:
                # Wrist-relative normalization for translation invariance
                features[offset + 0] = lm.x - wrist_x
                features[offset + 1] = lm.y - wrist_y
                features[offset + 2] = lm.z - wrist_z
                offset += 3

        return features, results

    def draw_landmarks(self, frame_bgr, results):
        """Draw standard pastel/animatic skeleton on image"""
        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                mp_drawing.draw_landmarks(
                    frame_bgr,
                    hand_landmarks,
                    mp_hands.HAND_CONNECTIONS,
                    mp_drawing_styles.get_default_hand_landmarks_style(),
                    mp_drawing_styles.get_default_hand_connections_style()
                )
        return frame_bgr

    def close(self):
        self.hands.close()

def run_webcam_collector(output_dir="data/sample_dataset", label="help", max_sequences=30, sequence_length=30):
    """
    Collects gesture sequences from live webcam and saves them as numpy files.
    """
    os.makedirs(f"{output_dir}/{label}", exist_ok=True)
    cap = cv2.VideoCapture(0)
    extractor = HandLandmarkExtractor(static_image_mode=False)

    print(f"=== Collecting {max_sequences} sequences for label: '{label}' ===")
    print("Press SPACE to start recording a sequence, or 'q' to quit.")

    seq_idx = 0
    while cap.isOpened() and seq_idx < max_sequences:
        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.flip(frame, 1) # Mirror preview
        features, results = extractor.extract_landmarks(frame)
        canvas = extractor.draw_landmarks(frame.copy(), results)

        cv2.putText(canvas, f"Label: {label} | Collected: {seq_idx}/{max_sequences}", (20, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (184, 166, 232), 2)
        cv2.putText(canvas, "Press SPACE to record 1 sec sequence", (20, 80),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (98, 184, 155), 2)
        cv2.imshow("Sign Bridge Landmark Collector", canvas)

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == 32: # SPACE
            print(f"Recording sequence {seq_idx + 1}/{max_sequences}...")
            sequence = []
            for frame_num in range(sequence_length):
                ret, frame = cap.read()
                if not ret:
                    break
                frame = cv2.flip(frame, 1)
                feat, res = extractor.extract_landmarks(frame)
                sequence.append(feat)

                disp = extractor.draw_landmarks(frame.copy(), res)
                cv2.putText(disp, f"RECORDING frame {frame_num+1}/{sequence_length}", (20, 60),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)
                cv2.imshow("Sign Bridge Landmark Collector", disp)
                cv2.waitKey(33) # ~30fps

            if len(sequence) == sequence_length:
                seq_arr = np.array(sequence) # shape: (30, 126)
                np_path = f"{output_dir}/{label}/seq_{seq_idx}_{int(cv2.getTickCount())}.npy"
                np.save(np_path, seq_arr)
                print(f"Saved: {np_path}")
                seq_idx += 1

    cap.release()
    cv2.destroyAllWindows()
    extractor.close()
    print("Data collection finished.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MediaPipe Landmark Extractor & Dataset Collector")
    parser.add_argument("--mode", choices=["webcam", "image"], default="webcam")
    parser.add_argument("--label", type=str, default="help", help="Sign gesture label to record")
    parser.add_argument("--num_seqs", type=int, default=15, help="Number of sequences to capture")
    args = parser.parse_args()

    if args.mode == "webcam":
        run_webcam_collector(label=args.label, max_sequences=args.num_seqs)
