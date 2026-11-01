# 🎸 Guitar Zero to Hero

A practice app that **listens to your guitar** through the microphone and coaches you from picking the instrument back up, through intermediate, to expert playing.

Everything runs in the browser. Audio is analysed locally and never leaves your device.

## What's in it

| Tool | What it does |
| --- | --- |
| **Tuner** | Chromatic tuner with standard-tuning string auto-detect, ±cents needle, adjustable A4 reference. |
| **Chord check** | Strum a chord; the app shows what it hears and confirms when every note rings. Chord diagrams with fingering for 24 common shapes. |
| **One-minute changes** | Classic chord-change drill: switch between two chords as many times as you can in 60 seconds. The app counts each change it hears and tracks your best score. |
| **Find the note** | Fretboard trainer: the app names a note and string, you play it, it checks the pitch. |
| **Rhythm** | Metronome with strumming patterns, plus a timing check that scores how evenly you strum against the click. "Count-in only" mode tests your inner clock. |
| **Lesson plans** | Level 1 "The Comeback" is a full 4-week plan (12 sessions, 20-30 min each) for someone returning to the guitar. Levels 2-4 (Foundations, Intermediate, Expert) are outlined. Press Start and the app walks you through a session: each task opens the right drill, ticks itself off when you hit the goal, and moves on to the next one by itself. Progress is saved in your browser. |

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

Use Chrome, Edge, Firefox or Safari. The microphone needs `localhost` or `https`. For the best results:

- Use a quiet room and sit 30-60 cm from the mic (a laptop or phone mic is fine).
- Wear headphones for the rhythm trainer so the mic doesn't hear the click.

To use it on your phone, deploy it with GitHub Pages: in the repo's **Settings → Pages**, set **Source** to **GitHub Actions**. Every push to `main` then publishes the app.

## How the listening works

- **Pitch** (tuner, find the note): the [YIN algorithm](http://audition.ens.fr/adc/pdf/2002_JASA_YIN.pdf) on 4096-sample frames, median-smoothed. It avoids the octave jumps plain autocorrelation makes on low guitar strings.
- **Chords**: an FFT chromagram built only from interpolated spectral peaks, matched against *harmonic-aware* chord templates (each chord tone also contributes energy at its octave, fifth and third harmonics, like a real string). A chord counts once it's the best match for ~240 ms.
- **Strums**: an energy onset detector, with each onset compared against the metronome grid.

The detectors are tested against synthesised plucked-string audio for every chord shape in the library (`npm test`).

## Project layout

```
src/audio/     microphone engine, pitch (YIN), FFT, chroma, chord matching, onsets, metronome
src/music/     notes, tuning, chord shapes
src/lessons/   lesson plan data
src/views/     tuner, drills, rhythm, lessons, home
tests/         unit tests incl. synthetic-guitar recognition tests
```

## Roadmap

- Detailed sessions for Level 2 (barre chords anywhere, fingerpicking, pentatonic and first solos)
- Strumming-pattern recognition (down vs up strokes)
- Song mode: follow a chord chart and get scored as you play along
- Practice streaks and history charts
