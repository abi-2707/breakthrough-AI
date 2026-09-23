/**
 * BREAK THROUGH AI — Sign Language Communication Bridge
 * Client-Side MediaPipe Hands Adapter
 * Initializes webcam, tracks up to 2 hands (21 3D landmarks each),
 * extracts wrist-normalized coordinates (126 features per frame),
 * and renders smooth pastel skeleton overlays on the HTML5 canvas.
 */

class HandTrackerService {
  constructor(videoElement, canvasElement, options = {}) {
    this.video = videoElement;
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    
    this.options = Object.assign({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.65,
      minTrackingConfidence: 0.55
    }, options);

    this.hands = null;
    this.camera = null;
    this.isRunning = false;
    this.onLandmarksCallback = null;
    this.lastFeatureVector = new Float32Array(126); // 2 hands * 21 landmarks * 3 coords
  }

  async init(onLandmarksCallback) {
    this.onLandmarksCallback = onLandmarksCallback;

    // Check if MediaPipe is available from CDN
    if (typeof window.Hands === 'undefined') {
      console.error('MediaPipe Hands script not loaded in window!');
      return false;
    }

    this.hands = new window.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    this.hands.setOptions({
      maxNumHands: this.options.maxNumHands,
      modelComplexity: this.options.modelComplexity,
      minDetectionConfidence: this.options.minDetectionConfidence,
      minTrackingConfidence: this.options.minTrackingConfidence
    });

    this.hands.onResults((results) => this.handleResults(results));
    return true;
  }

  async start() {
    if (this.isRunning) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });
      this.video.srcObject = stream;
      await this.video.play();
      this.isRunning = true;

      // Start processing frames via requestAnimationFrame
      const processLoop = async () => {
        if (!this.isRunning) return;
        if (this.video.readyState >= 2) {
          await this.hands.send({ image: this.video });
        }
        requestAnimationFrame(processLoop);
      };
      requestAnimationFrame(processLoop);
      return true;
    } catch (err) {
      console.error('HandTracker camera start failed:', err);
      throw err;
    }
  }

  stop() {
    this.isRunning = false;
    if (this.video && this.video.srcObject) {
      const stream = this.video.srcObject;
      stream.getTracks().forEach(track => track.stop());
      this.video.srcObject = null;
    }
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  handleResults(results) {
    if (!this.isRunning) return;

    // Clear and match canvas size to video size
    if (this.canvas.width !== this.video.videoWidth || this.canvas.height !== this.video.videoHeight) {
      this.canvas.width = this.video.videoWidth || 640;
      this.canvas.height = this.video.videoHeight || 480;
    }

    this.ctx.save();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const featureVector = new Float32Array(126);
    let handsDetected = 0;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      handsDetected = results.multiHandLandmarks.length;

      // Sort hands left to right by wrist X coordinate
      const sortedHands = results.multiHandLandmarks.map((landmarks, index) => {
        const handedness = results.multiHandedness && results.multiHandedness[index] 
          ? results.multiHandedness[index].label : 'Right';
        return { landmarks, handedness, wristX: landmarks[0].x };
      }).sort((a, b) => a.wristX - b.wristX);

      // Render pastel connections and joints
      sortedHands.forEach((handData, handIdx) => {
        this.drawPastelHand(handData.landmarks, handIdx === 0);

        if (handIdx < 2) {
          const baseOffset = handIdx * 63; // 21 * 3
          const wrist = handData.landmarks[0];

          for (let i = 0; i < 21; i++) {
            const lm = handData.landmarks[i];
            // Normalize relative to wrist
            featureVector[baseOffset + i * 3 + 0] = lm.x - wrist.x;
            featureVector[baseOffset + i * 3 + 1] = lm.y - wrist.y;
            featureVector[baseOffset + i * 3 + 2] = lm.z - wrist.z;
          }
        }
      });
    }

    this.ctx.restore();
    this.lastFeatureVector = featureVector;

    if (typeof this.onLandmarksCallback === 'function') {
      this.onLandmarksCallback({
        featureVector,
        handsDetected,
        rawResults: results
      });
    }
  }

  drawPastelHand(landmarks, isFirstHand = true) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Signature Pastel Color Schemes
    const boneColor = isFirstHand ? 'rgba(184, 166, 232, 0.85)' : 'rgba(168, 216, 240, 0.85)';
    const jointColor = isFirstHand ? '#5D43A8' : '#2B6CB0';
    const glowColor = isFirstHand ? '#C9BFF0' : '#A8E6CF';

    // Standard Hand Connections definition
    const connections = [
      [0,1],[1,2],[2,3],[3,4],        // Thumb
      [0,5],[5,6],[6,7],[7,8],        // Index
      [0,9],[9,10],[10,11],[11,12],   // Middle
      [0,13],[13,14],[14,15],[15,16], // Ring
      [0,17],[17,18],[18,19],[19,20], // Pinky
      [5,9],[9,13],[13,17]            // Palm
    ];

    // Draw bones
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = boneColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 8;

    connections.forEach(([i, j]) => {
      const p1 = landmarks[i];
      const p2 = landmarks[j];
      ctx.beginPath();
      ctx.moveTo(p1.x * w, p1.y * h);
      ctx.lineTo(p2.x * w, p2.y * h);
      ctx.stroke();
    });

    // Draw landmarks (joints)
    landmarks.forEach((lm, idx) => {
      const cx = lm.x * w;
      const cy = lm.y * h;
      const radius = idx === 0 || idx === 4 || idx === 8 || idx === 12 || idx === 16 || idx === 20 ? 5.5 : 3.5;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
      ctx.fillStyle = idx === 0 ? '#FFFFFF' : jointColor;
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();
    });
  }
}

window.HandTrackerService = HandTrackerService;
