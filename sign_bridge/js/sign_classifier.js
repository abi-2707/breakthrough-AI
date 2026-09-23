/**
 * BREAK THROUGH AI — Sign Language Communication Bridge
 * High-Accuracy Geometric Classifier Engine
 * Tailored for demo reference hand gestures:
 * 1.  👍 THUMBS UP       - Yes / Good / Agree
 * 2.  👎 THUMBS DOWN     - No / Bad / Disagree
 * 3.  ✌️ VICTORY / PEACE  - Peace / Two
 * 4.  🤟 LOVE YOU (ILY)  - I Love You
 * 5.  🤘 ROCK ON         - Horns / Strength
 * 6.  🤙 CALL ME         - Shaka / Contact
 * 7.  👌 OK HAND         - OK / Perfect / Understood
 * 8.  ✋ OPEN PALM       - Hello / Stop / Attention
 * 9.  ✊ RAISED FIST     - Power / Hold / Solid
 * 10. 👆 POINT UP        - Attention / One / Question
 * 11. 🙏 GRATITUDE       - Thank You / Namaste (2 hands)
 * 12. 👏 APPLAUSE        - Clapping / Great Job (2 hands)
 */

class SignClassifierService {
  constructor(options = {}) {
    this.bufferSize = options.bufferSize || 30;
    this.frameBuffer = [];
    this.debounceMs = 1200; // Time between repeated identical sign triggers
    this.lastTriggerTime = 0;
    this.lastSignSent = null;

    // Temporal stability tracker: require gesture to be held for 3 consecutive frames
    this.candidateHistory = [];
    this.stabilityThreshold = 3;
  }

  pushFrame(featureVector, handsDetected, rawResults) {
    if (!rawResults || !rawResults.multiHandLandmarks || rawResults.multiHandLandmarks.length === 0) {
      this.candidateHistory = [];
      return null;
    }

    const landmarks = rawResults.multiHandLandmarks;
    return this.classifyLandmarks(landmarks, rawResults.multiHandedness || []);
  }

  // 3D Euclidean distance
  dist3D(p1, p2) {
    if (!p1 || !p2) return 999;
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = (p1.z || 0) - (p2.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  // 2D Euclidean distance (for screen plane alignment)
  dist2D(p1, p2) {
    if (!p1 || !p2) return 999;
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Detailed finger kinematics analysis
   * Landmark Indices:
   * Wrist: 0
   * Thumb:  CMC=1, MCP=2, IP=3,  TIP=4
   * Index:  MCP=5, PIP=6, DIP=7, TIP=8
   * Middle: MCP=9, PIP=10, DIP=11, TIP=12
   * Ring:   MCP=13, PIP=14, DIP=15, TIP=16
   * Pinky:  MCP=17, PIP=18, DIP=19, TIP=20
   */
  analyzeHand(hand) {
    const wrist = hand[0];
    const middleMcp = hand[9];
    const palmLength = Math.max(0.01, this.dist3D(wrist, middleMcp));

    // Distance of each tip from wrist relative to its PIP / MCP
    const isExtended = (tipIdx, pipIdx, mcpIdx) => {
      const tipDist = this.dist3D(hand[tipIdx], wrist);
      const pipDist = this.dist3D(hand[pipIdx], wrist);
      const mcpDist = this.dist3D(hand[mcpIdx], wrist);
      return tipDist > pipDist * 1.12 && tipDist > mcpDist * 1.15;
    };

    const isCurled = (tipIdx, pipIdx, mcpIdx) => {
      const tipDist = this.dist3D(hand[tipIdx], wrist);
      const pipDist = this.dist3D(hand[pipIdx], wrist);
      const mcpDist = this.dist3D(hand[mcpIdx], wrist);
      return tipDist < pipDist * 0.98 || tipDist < mcpDist * 1.05;
    };

    // Thumb extension: tip (4) is far away from palm base (MCP 17 & 5)
    const thumbDistPinkyMcp = this.dist3D(hand[4], hand[17]);
    const thumbDistWrist = this.dist3D(hand[4], wrist);
    const thumbExtended = thumbDistPinkyMcp > palmLength * 0.75 && thumbDistWrist > palmLength * 0.8;
    const thumbCurled = !thumbExtended;

    const indexExt = isExtended(8, 6, 5);
    const indexCurl = isCurled(8, 6, 5);

    const middleExt = isExtended(12, 10, 9);
    const middleCurl = isCurled(12, 10, 9);

    const ringExt = isExtended(16, 14, 13);
    const ringCurl = isCurled(16, 14, 13);

    const pinkyExt = isExtended(20, 18, 17);
    const pinkyCurl = isCurled(20, 18, 17);

    // Tip to thumb tip distances (normalized by palm length)
    const thumbToIndexTip = this.dist3D(hand[4], hand[8]) / palmLength;
    const thumbToMiddleTip = this.dist3D(hand[4], hand[12]) / palmLength;

    // Vector from wrist to thumb tip to test direction
    const thumbVectorY = hand[4].y - wrist.y; // Negative means UP in screen coords, Positive means DOWN
    const thumbTipAboveIp = hand[4].y < hand[3].y;
    const thumbTipBelowIp = hand[4].y > hand[3].y;

    return {
      wrist,
      palmLength,
      thumb: { extended: thumbExtended, curled: thumbCurled, tipAbove: thumbTipAboveIp, tipBelow: thumbTipBelowIp, vecY: thumbVectorY },
      index: { extended: indexExt, curled: indexCurl },
      middle: { extended: middleExt, curled: middleCurl },
      ring: { extended: ringExt, curled: ringCurl },
      pinky: { extended: pinkyExt, curled: pinkyCurl },
      thumbToIndexTip,
      thumbToMiddleTip,
      raw: hand
    };
  }

  classifyLandmarks(hands, handednessList) {
    const numHands = hands.length;
    let candidate = null;
    let confidence = 0.0;
    let emoji = "";
    let speechText = "";

    // ==============================================================
    // 1. TWO-HAND GESTURES (GRATITUDE & APPLAUSE)
    // ==============================================================
    if (numHands >= 2) {
      const h1 = this.analyzeHand(hands[0]);
      const h2 = this.analyzeHand(hands[1]);

      const wristDist = this.dist3D(h1.wrist, h2.wrist);
      const indexTipDist = this.dist3D(h1.raw[8], h2.raw[8]);
      const avgPalm = (h1.palmLength + h2.palmLength) / 2;

      // A. GRATITUDE / NAMASTE (🙏): Both hands close together, all fingers extended upward
      const bothFingersUp = (h1.index.extended && h1.middle.extended && h2.index.extended && h2.middle.extended);
      if (bothFingersUp && wristDist < avgPalm * 1.6 && indexTipDist < avgPalm * 1.2) {
        candidate = "Gratitude (Thank You)";
        emoji = "🙏";
        speechText = "Thank you";
        confidence = 0.95;
      }
      // B. APPLAUSE / CLAPPING (👏): Palms facing each other horizontally close together
      else if (wristDist < avgPalm * 1.5 && indexTipDist < avgPalm * 1.8) {
        candidate = "Applause";
        emoji = "👏";
        speechText = "Applause";
        confidence = 0.92;
      }
    }

    // ==============================================================
    // 2. ONE-HAND DEMO GESTURES (FROM USER'S REFERENCE IMAGE)
    // ==============================================================
    if (!candidate && numHands >= 1) {
      const h = this.analyzeHand(hands[0]);
      const hand = h.raw;

      const fourFingersCurled = h.index.curled && h.middle.curled && h.ring.curled && h.pinky.curled;
      const fourFingersExtended = h.index.extended && h.middle.extended && h.ring.extended && h.pinky.extended;

      // 1. 👍 THUMBS UP: Thumb extended UP, other 4 fingers curled tight
      if (h.thumb.extended && fourFingersCurled && h.thumb.tipAbove && h.thumb.vecY < -0.05) {
        candidate = "Thumbs Up";
        emoji = "👍";
        speechText = "Yes, agreed";
        confidence = 0.96;
      }
      // 2. 👎 THUMBS DOWN: Thumb extended DOWN, other 4 fingers curled tight
      else if (h.thumb.extended && fourFingersCurled && h.thumb.tipBelow && h.thumb.vecY > 0.05) {
        candidate = "Thumbs Down";
        emoji = "👎";
        speechText = "No, disagree";
        confidence = 0.95;
      }
      // 3. 👌 OK HAND: Thumb tip & Index tip pinching in loop (<0.35 palmLength), Middle + Ring + Pinky extended
      else if (h.thumbToIndexTip < 0.35 && h.middle.extended && h.ring.extended && h.pinky.extended) {
        candidate = "OK Hand";
        emoji = "👌";
        speechText = "OK, understood";
        confidence = 0.96;
      }
      // 4. 🤟 LOVE YOU (ILY): Thumb + Index + Pinky extended, Middle & Ring curled tight
      else if (h.thumb.extended && h.index.extended && h.pinky.extended && h.middle.curled && h.ring.curled) {
        candidate = "Love You";
        emoji = "🤟";
        speechText = "I love you";
        confidence = 0.96;
      }
      // 5. 🤘 ROCK ON (HORNS): Index + Pinky extended, Middle & Ring curled, Thumb folded/curled
      else if (!h.thumb.extended && h.index.extended && h.pinky.extended && h.middle.curled && h.ring.curled) {
        candidate = "Rock On";
        emoji = "🤘";
        speechText = "Rock on";
        confidence = 0.95;
      }
      // 6. 🤙 CALL ME (SHAKA): Thumb + Pinky extended outward, Index + Middle + Ring curled tight
      else if (h.thumb.extended && h.pinky.extended && h.index.curled && h.middle.curled && h.ring.curled) {
        candidate = "Call Me";
        emoji = "🤙";
        speechText = "Call me";
        confidence = 0.95;
      }
      // 7. ✌️ VICTORY / PEACE ("V" / "2"): Index & Middle extended, Ring & Pinky curled, Thumb curled
      else if (h.index.extended && h.middle.extended && h.ring.curled && h.pinky.curled) {
        const spread = this.dist3D(hand[8], hand[12]) / h.palmLength;
        candidate = "Victory / Peace";
        emoji = "✌️";
        speechText = "Victory";
        confidence = spread > 0.15 ? 0.96 : 0.91;
      }
      // 8. 👆 POINTING UP: Index finger extended pointing UP, all other 3 fingers curled tight
      else if (h.index.extended && h.middle.curled && h.ring.curled && h.pinky.curled && hand[8].y < hand[6].y) {
        candidate = "Pointing Up";
        emoji = "👆";
        speechText = "Attention, question";
        confidence = 0.95;
      }
      // 9. ✋ OPEN PALM / HI / STOP: All 5 fingers extended upright
      else if (h.thumb.extended && fourFingersExtended) {
        candidate = "Open Palm (Hi / Stop)";
        emoji = "✋";
        speechText = "Hello, stop";
        confidence = 0.94;
      }
      // 10. ✊ RAISED FIST / POWER: All fingers curled tight into a solid fist
      else if (fourFingersCurled && !h.thumb.extended) {
        candidate = "Raised Fist";
        emoji = "✊";
        speechText = "Solidarity, power";
        confidence = 0.92;
      }
    }

    // ==============================================================
    // 3. TEMPORAL STABILITY FILTER
    // ==============================================================
    if (!candidate) {
      this.candidateHistory = [];
      return null;
    }

    this.candidateHistory.push(candidate);
    if (this.candidateHistory.length > this.stabilityThreshold) {
      this.candidateHistory.shift();
    }

    const isStable = this.candidateHistory.length >= this.stabilityThreshold &&
      this.candidateHistory.every(c => c === candidate);

    const now = Date.now();
    // Allow triggering if it's a new sign OR if debounce time passed
    const isNewSign = this.lastSignSent !== candidate;
    const debounceElapsed = (now - this.lastTriggerTime) >= this.debounceMs;

    if (isStable && (isNewSign || debounceElapsed)) {
      this.lastTriggerTime = now;
      this.lastSignSent = candidate;
      this.candidateHistory = []; // Reset after confirmation

      return {
        sign: candidate,
        emoji: emoji,
        speechText: speechText,
        confidence: Math.round(confidence * 100),
        timestamp: new Date().toLocaleTimeString(),
        isWord: true
      };
    }

    return null;
  }

  reset() {
    this.candidateHistory = [];
    this.lastSignSent = null;
  }
}

window.SignClassifierService = SignClassifierService;
