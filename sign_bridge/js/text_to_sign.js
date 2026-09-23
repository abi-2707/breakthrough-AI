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
      // Core Medical Phrases
      "pain": { label: "PAIN", icon: "activity", desc: "Both index fingers pointing towards location of discomfort", color: "#FFB3B3" },
      "help": { label: "HELP", icon: "hand-helping", desc: "Flat left palm supporting a 'thumbs-up' right fist lifting upward", color: "#B8A6E8" },
      "water": { label: "WATER", icon: "droplets", desc: "'W' handshape (3 fingers up) tapping gently at the chin/lips", color: "#A8D8F0" },
      "doctor": { label: "DOCTOR", icon: "stethoscope", desc: "Right fingertips tap inside wrist where a pulse is taken", color: "#A8E6CF" },
      "yes": { label: "YES", icon: "check", desc: "Fist nodding up and down like a head nod", color: "#A8E6CF" },
      "no": { label: "NO", icon: "x", desc: "Index and middle fingers snap down onto the thumb", color: "#FFB3B3" },
      "medicine": { label: "MEDICINE", icon: "pill", desc: "Right middle finger pivots gently in the open palm of left hand", color: "#B8A6E8" },
      "emergency": { label: "EMERGENCY", icon: "alert-triangle", desc: "'E' handshape shaking side to side with urgency", color: "#FFD3B0" },
      "nurse": { label: "NURSE", icon: "heart-pulse", desc: "Two fingers tap the wrist like taking a pulse", color: "#A8D8F0" },
      "restroom": { label: "RESTROOM", icon: "door-closed", desc: "'T' handshape shaking side to side", color: "#C9BFF0" },
      "ok": { label: "OK", icon: "thumbs-up", desc: "Fingerspell O then K, or clear thumbs up", color: "#A8E6CF" },
      "stop": { label: "STOP", icon: "octagon", desc: "Left palm flat, right hand chops down onto the palm", color: "#FFB3B3" }
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
