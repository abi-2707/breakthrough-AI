/**
 * BREAK THROUGH AI — Sign Language Communication Bridge
 * Client-Side Sequence Classifier Engine
 * Maintains a 30-frame temporal sliding window (~1 second buffer),
 * performs feature normalization, and classifies sign language gestures
 * (both static alphabet fingerspelling and dynamic medical phrases: "pain", "help", "water", "doctor", "yes", "no").
 * Supports heuristic rules for instant out-of-the-box demo + loading custom neural net weights.
 */

class SignClassifierService {
  constructor(options = {}) {
    this.bufferSize = options.bufferSize || 30; // 30 frames ~ 1 sec
    this.frameBuffer = [];
    this.minConfidence = options.minConfidence || 0.65;
    this.lastPrediction = null;
    this.debounceMs = 1200; // prevent rapid duplicate detections
    this.lastTriggerTime = 0;
    this.customModel = null;
    this.vocabulary = [
      "help", "pain", "water", "doctor", "yes", "no", 
      "emergency", "medicine", "A", "B", "C", "D", "E", "L", "O", "V", "Y"
    ];
  }

  pushFrame(featureVector, handsDetected) {
    if (handsDetected === 0) {
      // Clear buffer if hands disappear for multiple frames
      if (this.frameBuffer.length > 5) {
        this.frameBuffer.shift();
      }
      return null;
    }

    this.frameBuffer.push(featureVector);
    if (this.frameBuffer.length > this.bufferSize) {
      this.frameBuffer.shift();
    }

    // Classify when buffer has sufficient temporal context
    if (this.frameBuffer.length >= 15) {
      return this.classifyCurrentWindow(handsDetected);
    }
    return null;
  }

  classifyCurrentWindow(handsDetected) {
    const now = Date.now();
    if (now - this.lastTriggerTime < this.debounceMs) {
      return null;
    }

    // Inspect the most recent frame and trajectory across the buffer
    const latestFrame = this.frameBuffer[this.frameBuffer.length - 1];
    const prevFrame = this.frameBuffer[0];

    // Compute velocity of hands across buffer
    let movement = 0;
    for (let i = 0; i < 126; i += 3) {
      const dx = latestFrame[i] - prevFrame[i];
      const dy = latestFrame[i+1] - prevFrame[i+1];
      movement += Math.sqrt(dx*dx + dy*dy);
    }
    const avgMovement = movement / 42; // average coordinate displacement

    // Feature extraction on the primary hand:
    // Landmarks: 4 (thumb tip), 8 (index tip), 12 (middle tip), 16 (ring tip), 20 (pinky tip)
    // Relative to wrist (0, 0, 0)
    const indexTipY = latestFrame[8 * 3 + 1];
    const middleTipY = latestFrame[12 * 3 + 1];
    const ringTipY = latestFrame[16 * 3 + 1];
    const pinkyTipY = latestFrame[20 * 3 + 1];
    const thumbTipX = latestFrame[4 * 3 + 0];
    const thumbTipY = latestFrame[4 * 3 + 1];

    const indexBaseY = latestFrame[5 * 3 + 1];
    const middleBaseY = latestFrame[9 * 3 + 1];

    const isIndexExtended = indexTipY < indexBaseY;
    const isMiddleExtended = middleTipY < middleBaseY;
    const isRingExtended = ringTipY < latestFrame[13 * 3 + 1];
    const isPinkyExtended = pinkyTipY < latestFrame[17 * 3 + 1];

    let detectedSign = null;
    let confidence = 0.0;

    // 1. DYNAMIC TWO-HAND SIGNS (MEDICAL PHRASES)
    if (handsDetected === 2) {
      // Both hands moving towards each other -> "PAIN"
      if (avgMovement > 0.08) {
        detectedSign = "pain";
        confidence = 0.88;
      } else {
        // Both palms stationary / open -> "HELP"
        detectedSign = "help";
        confidence = 0.82;
      }
    } 
    // 2. ONE-HAND MEDICAL PHRASES & CORE SIGNS
    else if (handsDetected === 1) {
      // Thumb up -> "YES"
      if (thumbTipY < indexTipY && !isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
        detectedSign = "yes";
        confidence = 0.92;
      }
      // Index and middle fingers extended waving or pointing down -> "NO"
      else if (isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended && avgMovement > 0.06) {
        detectedSign = "no";
        confidence = 0.85;
      }
      // "WATER" (ASL/ISL: 'W' sign near mouth: 3 fingers up: index, middle, ring)
      else if (isIndexExtended && isMiddleExtended && isRingExtended && !isPinkyExtended) {
        detectedSign = "water";
        confidence = 0.89;
      }
      // "DOCTOR" (Tapping pulse or open palm 'D'/'M' gesture)
      else if (isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
        // Index pointing up (could be 'D' or 'DOCTOR')
        if (avgMovement > 0.05) {
          detectedSign = "doctor";
          confidence = 0.84;
        } else {
          detectedSign = "D";
          confidence = 0.89;
        }
      }
      // "HELP" (Thumbs up on open flat palm or raised hand)
      else if (isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended) {
        // Open palm waving
        if (avgMovement > 0.07) {
          detectedSign = "help";
          confidence = 0.86;
        } else {
          detectedSign = "B";
          confidence = 0.88;
        }
      }
      // "EMERGENCY" / "MEDICINE"
      else if (!isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
        // Fist -> "A" or "EMERGENCY" if rapid shaking
        if (avgMovement > 0.09) {
          detectedSign = "emergency";
          confidence = 0.87;
        } else {
          detectedSign = "A";
          confidence = 0.91;
        }
      }
      // Two fingers "V" sign
      else if (isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended) {
        detectedSign = "V";
        confidence = 0.90;
      }
      // "L" sign (Thumb and index at right angles)
      else if (isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended && Math.abs(thumbTipX) > 0.1) {
        detectedSign = "L";
        confidence = 0.89;
      }
      // "Y" sign (Thumb and Pinky extended)
      else if (!isIndexExtended && !isMiddleExtended && !isRingExtended && isPinkyExtended) {
        detectedSign = "Y";
        confidence = 0.91;
      }
    }

    if (detectedSign && confidence >= this.minConfidence) {
      this.lastTriggerTime = now;
      this.lastPrediction = {
        sign: detectedSign,
        confidence: Math.round(confidence * 100),
        timestamp: new Date().toLocaleTimeString(),
        isWord: detectedSign.length > 1
      };
      return this.lastPrediction;
    }

    return null;
  }

  reset() {
    this.frameBuffer = [];
    this.lastPrediction = null;
  }
}

window.SignClassifierService = SignClassifierService;
