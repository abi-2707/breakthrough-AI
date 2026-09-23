/**
 * BREAK THROUGH AI — Sign Language Communication Bridge
 * Text -> Sign Playback Engine
 * Parses messages into word and letter tokens, looks up matching sign video/SVG animations,
 * falls back gracefully to letter-by-letter fingerspelling, and drives the animated sign player.
 */

class TextToSignEngine {
  constructor(displayContainer, options = {}) {
    this.container = displayContainer;
    this.playbackSpeed = options.playbackSpeed || 1.0;
    this.isPlaying = false;
    this.playlist = [];
    this.currentIndex = 0;
    this.timer = null;

    // Supported medical & conversational dictionary
    this.dictionary = {
      // Core Medical & Everyday Demo Gestures
      "yes": { label: "THUMBS UP (YES)", icon: "thumbs-up", desc: "Thumb extended straight up, other 4 fingers curled into a fist", color: "#A8E6CF" },
      "agree": { label: "THUMBS UP (AGREE)", icon: "thumbs-up", desc: "Thumb extended straight up, agreeing with officer", color: "#A8E6CF" },
      "no": { label: "THUMBS DOWN (NO)", icon: "thumbs-down", desc: "Thumb extended straight down, indicating no or discomfort", color: "#FFB3B3" },
      "disagree": { label: "THUMBS DOWN (DISAGREE)", icon: "thumbs-down", desc: "Thumb extended straight down", color: "#FFB3B3" },
      "ok": { label: "OK HAND", icon: "check-circle", desc: "Thumb & index fingertip touching in loop, 3 fingers extended", color: "#A8E6CF" },
      "victory": { label: "VICTORY / PEACE", icon: "hand", desc: "Index & middle fingers extended in a V-shape, peace sign", color: "#B8A6E8" },
      "peace": { label: "VICTORY / PEACE", icon: "hand", desc: "Index & middle fingers extended in a V-shape", color: "#B8A6E8" },
      "two": { label: "TWO (V-SHAPE)", icon: "hand", desc: "Index and middle fingers extended", color: "#B8A6E8" },
      "love": { label: "I LOVE YOU (ILY)", icon: "heart", desc: "Thumb, index, and pinky extended; middle and ring curled", color: "#FFB3D9" },
      "rock": { label: "ROCK ON (HORNS)", icon: "flame", desc: "Index & pinky extended, middle & ring curled, thumb folded", color: "#FFD3B0" },
      "call": { label: "CALL ME (SHAKA)", icon: "phone-call", desc: "Thumb & pinky extended outward, 3 middle fingers curled", color: "#A8D8F0" },
      "contact": { label: "CALL ME / CONTACT", icon: "phone", desc: "Thumb & pinky extended outward", color: "#A8D8F0" },
      "hello": { label: "HELLO (OPEN PALM)", icon: "hand", desc: "All 5 fingers extended upright and open facing forward", color: "#A8E6CF" },
      "hi": { label: "HI (OPEN PALM)", icon: "hand", desc: "All 5 fingers extended upright facing forward", color: "#A8E6CF" },
      "stop": { label: "STOP (OPEN PALM)", icon: "octagon", desc: "Open palm facing forward firmly to pause or stop", color: "#FFB3B3" },
      "fist": { label: "RAISED FIST", icon: "shield", desc: "All 5 fingers curled tight into a solid fist", color: "#D1C4E9" },
      "power": { label: "RAISED FIST / SOLID", icon: "shield", desc: "Solid fist held up firmly", color: "#D1C4E9" },
      "question": { label: "POINTING UP", icon: "help-circle", desc: "Index finger extended straight up for attention/question", color: "#B8A6E8" },
      "attention": { label: "POINTING UP", icon: "alert-circle", desc: "Index finger pointing up", color: "#B8A6E8" },
      "thanks": { label: "GRATITUDE / THANK YOU", icon: "heart-handshake", desc: "Both palms pressed together with fingers up in gratitude", color: "#A8E6CF" },
      "thank": { label: "GRATITUDE / THANK YOU", icon: "heart-handshake", desc: "Both palms pressed together in gratitude", color: "#A8E6CF" },
      "clap": { label: "APPLAUSE", icon: "sparkles", desc: "Both hands clapping together in applause", color: "#FFD3B0" },
      "applause": { label: "APPLAUSE", icon: "sparkles", desc: "Both hands clapping together", color: "#FFD3B0" },
      // Medical core
      "pain": { label: "PAIN", icon: "activity", desc: "Both index fingers pointing towards location of discomfort", color: "#FFB3B3" },
      "help": { label: "HELP", icon: "hand-helping", desc: "Flat left palm supporting a 'thumbs-up' right fist lifting upward", color: "#B8A6E8" },
      "water": { label: "WATER", icon: "droplets", desc: "'W' handshape (3 fingers up) tapping gently at chin/lips", color: "#A8D8F0" },
      "doctor": { label: "DOCTOR", icon: "stethoscope", desc: "Right fingertips tap inside wrist where a pulse is taken", color: "#A8E6CF" },
      "medicine": { label: "MEDICINE", icon: "pill", desc: "Right middle finger pivots gently in open palm of left hand", color: "#B8A6E8" },
      "nurse": { label: "NURSE", icon: "heart-pulse", desc: "Two fingers tap the wrist like taking a pulse", color: "#A8D8F0" }
    };
  }

  translate(text) {
    if (!text || typeof text !== 'string') return [];
    
    // Clean and split into word tokens
    const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
    const queue = [];

    words.forEach(word => {
      // 1. Full word match in sign dictionary
      if (this.dictionary[word]) {
        queue.push({
          type: 'word',
          token: word,
          meta: this.dictionary[word]
        });
      } else {
        // 2. Fallback to Letter-by-Letter Fingerspelling
        for (let char of word) {
          queue.push({
            type: 'letter',
            token: char.toUpperCase(),
            meta: {
              label: `LETTER ${char.toUpperCase()}`,
              icon: "type",
              desc: `Fingerspelling letter '${char.toUpperCase()}'`,
              color: "#E3DEF2"
            }
          });
        }
      }
    });

    return queue;
  }

  playSequence(text, onStepChange, onFinish) {
    this.stop();
    this.playlist = this.translate(text);
    if (this.playlist.length === 0) return;

    this.isPlaying = true;
    this.currentIndex = 0;

    const playNext = () => {
      if (!this.isPlaying) return;

      if (this.currentIndex >= this.playlist.length) {
        this.isPlaying = false;
        if (typeof onFinish === 'function') onFinish();
        return;
      }

      const item = this.playlist[this.currentIndex];
      this.renderSignItem(item);

      if (typeof onStepChange === 'function') {
        onStepChange({
          index: this.currentIndex,
          total: this.playlist.length,
          item: item
        });
      }

      this.currentIndex += 1;
      // Duration per item: 1.4s for full phrases, 0.75s for fingerspelled letters
      const duration = (item.type === 'word' ? 1400 : 750) / this.playbackSpeed;
      this.timer = setTimeout(playNext, duration);
    };

    playNext();
  }

  stop() {
    this.isPlaying = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  renderSignItem(item) {
    if (!this.container) return;

    const isWord = item.type === 'word';
    this.container.innerHTML = `
      <div class="h-full flex flex-col items-center justify-center p-6 text-center animate-rise">
        <!-- Animated Badge Indicator -->
        <div class="mb-3">
          <span class="text-[11px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full ${isWord ? 'badge-emerald' : 'badge-amber'} shadow-sm">
            ${isWord ? '✦ Medical Phrase' : '⌨ Fingerspelling'}
          </span>
        </div>

        <!-- Central Animated Sign Graphic Representation -->
        <div class="w-36 h-36 rounded-3xl bg-white border-2 border-[#B8A6E8] shadow-xl flex flex-col items-center justify-center p-4 relative overflow-hidden alarm-flame-pulse">
          <div class="absolute inset-0 bg-gradient-to-br from-[#B8A6E8]/10 via-[#A8D8F0]/10 to-transparent"></div>
          
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#B8A6E8] to-[#A8D8F0] text-[#3A3552] flex items-center justify-center shadow-md mb-2">
            ${isWord 
              ? `<i data-lucide="${item.meta.icon}" class="w-9 h-9 text-[#3A3552]"></i>`
              : `<span class="text-3xl font-black font-mono text-[#3A3552]">${item.token}</span>`
            }
          </div>

          <span class="text-base font-black tracking-wider uppercase text-[#3A3552] z-10">${item.token}</span>
        </div>

        <!-- Gesture Instruction Note -->
        <div class="mt-4 max-w-xs">
          <h5 class="text-sm font-bold text-[#3A3552]">${item.meta.label}</h5>
          <p class="text-xs text-[#8B87A3] mt-1 leading-snug">${item.meta.desc}</p>
        </div>
      </div>
    `;

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }
}

window.TextToSignEngine = TextToSignEngine;
