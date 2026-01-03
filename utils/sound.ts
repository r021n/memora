import * as Tone from "tone";

let isInitialized = false;

// Initialize Tone.js context (must be called after a user interaction)
export const initAudio = async () => {
  if (!isInitialized || Tone.context.state !== "running") {
    await Tone.start();
    if (Tone.context.state === "suspended") {
      await Tone.context.resume();
    }
    isInitialized = true;

    // Set master volume slightly lower to avoid clipping
    Tone.Destination.volume.value = -8;
  }
};

// --- SYNTHS ---

// For UI Clicks: MembraneSynth gives a nice "tap" sound
// Adjusted envelope to be snappier to reduce audio lag perception
const clickSynth = new Tone.MembraneSynth({
  volume: +10,
  pitchDecay: 0.05,
  octaves: 2,
  oscillator: { type: "sine" },
  envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
}).toDestination();

// For Correct Answers
const correctSynth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: "triangle" },
  envelope: { attack: 0.02, decay: 0.1, sustain: 0.1, release: 1 },
}).toDestination();

// For Incorrect Answers
const wrongSynth = new Tone.Synth({
  oscillator: { type: "sawtooth" },
  envelope: { attack: 0.05, decay: 0.2, sustain: 0, release: 0.4 },
}).toDestination();

// For Finish
const finishSynth = new Tone.Synth({
  oscillator: { type: "sine" },
  envelope: { attack: 0.02, decay: 0.2, sustain: 0.2, release: 1.5 },
}).toDestination();

// --- ACTIONS ---

export const playClick = () => {
  // Always try to resume context on interaction if suspended
  if (Tone.context.state !== "running") {
    initAudio().catch(() => {});
  }
  // Quick, muted tap
  clickSynth.triggerAttackRelease("G2", "32n");
};

export const playCorrect = () => {
  if (Tone.context.state !== "running") initAudio().catch(() => {});
  const now = Tone.now();
  correctSynth.triggerAttackRelease(["C5", "E5"], "8n", now);
  correctSynth.triggerAttackRelease("G5", "8n", now + 0.1);
};

export const playIncorrect = () => {
  if (Tone.context.state !== "running") initAudio().catch(() => {});
  wrongSynth.triggerAttackRelease("G2", "8n");
};

export const playFinish = () => {
  if (Tone.context.state !== "running") initAudio().catch(() => {});
  const now = Tone.now();
  finishSynth.triggerAttackRelease("C4", "8n", now);
  finishSynth.triggerAttackRelease("E4", "8n", now + 0.15);
  finishSynth.triggerAttackRelease("G4", "8n", now + 0.3);
  finishSynth.triggerAttackRelease("C5", "4n", now + 0.45);
};

/**
 * Helper to play sound, wait for animation/audio attack, then execute callback.
 * This solves the issue of animations being cut off by instant navigation.
 */
export const withSound = (callback: () => void, delay: number = 150) => {
  playClick();
  if (delay === 0) {
    callback();
  } else {
    setTimeout(() => {
      callback();
    }, delay);
  }
};
