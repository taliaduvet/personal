"""Bass reference content — verbatim from product spec. Imported by generate_index.py."""

STYLES = [
    {
        "id": '808-sub',
        "type": 'style',
        "title": '808 / Sub Bass',
        "oneLiner": 'One-liner: Felt more than heard. The floor-shaking foundation.',
        "filters": ['electronic', 'dance'],
        "sections": {
            'sound': 'Sound: Pure sine wave with a punchy click transient, followed by a long pitched decay. You feel it more than hear it — physical weight between 40–80 Hz. The 808 adds a pitch-dive on attack that gives it that recognisable bloom. Finneas pitches kicks and 808s to the root note of every song.',
            'emotion': 'Emotion: Heavy, intimate, threatening, or desolate. Makes the low end feel enormous without being busy.',
            'whenUse': 'When to use: Slow to mid tempo (under 110 BPM), dark or sparse arrangements, low and intimate vocals. This style owns the sub — nothing else should fight it below 100 Hz.',
            'whenNot': 'When not to use: Dense busy arrangements at 130+ BPM. Too slow and spread to pump with a fast kick.',
            'build': 'Build (Massive): Init patch → OSC1 Sin-Tri wavetable, pitch −24, Wt-position 0. OSC2 Sin-Sqr, pitch −24, Amp 100%. Filter1 Lowpass 4 at 180 Hz. Tele Tube in FX1 at 25% drive for the attack click. Amp Env: Attack 0, Decay 30%, Sustain 80%, Release 20%. Mono/legato, 10ms glide.',
            'signalChain': 'Signal chain: HPF 35Hz → Waves RBass → Waves CLA-76 (4:1) → Dynamic EQ with kick sidechain → Waves MaxxBass.',
            'keyTip': "Key tip: Tune the 808 to the root note of the song. An A-tuned 808 over an Eb chord causes beating that sounds wrong even if you can't name why. An out-of-key 808 is the single most common reason 808s feel sloppy rather than musical.",
            'references': 'References: Billie Eilish, Lorde, SZA, Drake.',
        },
        "meta": {
            'tag': 'Electronic'
        },
        "context": {
            "tempo": ["under 80", "80-100"],
            "density": ["sparse", "medium"],
            "vocal": ["intimate", "low"],
            "tone": ["defiant", "intense", "melancholy", "cinematic", "vulnerable"],
        },
    },
    {
        "id": 'pure-sine-sub',
        "type": 'style',
        "title": 'Pure Sine Sub',
        "oneLiner": 'One-liner: Invisible on laptops. Enormous in clubs. The reinforcement layer.',
        "filters": ['electronic'],
        "sections": {
            'sound': "Sound: Just the fundamental frequency — no harmonics at all. Virtually inaudible on phone speakers and laptops. On a subwoofer or club system it's enormous. Its job is to fill the room, not to be heard.",
            'emotion': 'Emotion: Weight without character. Supports everything without drawing attention to itself.',
            'whenUse': 'When to use: Always as a sub layer beneath a character bass (live DI, pluck, analog synth). Never used alone — always layered. Essential in any commercial pop production.',
            'whenNot': 'When not to use: As the only bass — it disappears on small speakers. Always pair it with a mid-range character layer.',
            'build': 'Build: Ableton Operator or Massive: single sine oscillator, −24 pitch, low-pass filter hard at 100 Hz. Or use Waves RBass on a parallel track to synthesise a sub from an existing bass — this is exactly what Rob Bisel did on SZA\'s "Kill Bill": he duplicated the DI bass track, removed all plugins from the duplicate, and put only Waves RBass on it at 60 Hz. He called it the "Bass Edit" track. One performance, two frequency layers.',
            'signalChain': 'Signal chain: HPF 30Hz → Hard LP 100Hz → Utility (mono only) → Waves RBass (parallel track).',
            'keyTip': 'Key tip: Keep this layer completely mono. Any stereo processing below 100 Hz causes phase cancellation when the mix is summed to mono — which is how Bluetooth speakers, phone speakers, and many club systems play audio.',
            'references': 'References: Adele (Hello), most modern pop.',
        },
        "meta": {
            'tag': 'Electronic'
        },
    },
    {
        "id": 'reese',
        "type": 'style',
        "title": 'Reese Bass',
        "oneLiner": 'One-liner: Two detuned saws beating against each other. Growl, movement, menace.',
        "filters": ['electronic'],
        "context": {
            "tempo": ["120-135", "135"],
            "density": ["medium", "dense"],
            "tone": ["defiant", "intense", "euphoric"],
        },
        "sections": {
            'sound': 'Sound: Two slightly detuned sawtooth oscillators create constant phase-beating — a "wub-wub" or growl. The sound is never static, always moving, and has a dark sinister quality. Historically associated with jungle and DnB; in pop, used as a distortion layer or chorus intensity driver rather than the primary bass. The original Reese was created by Kevin Saunderson in 1988 on a Casio CZ phase-distortion synth — it had a lo-fi gritty character that came from the instrument\'s limitations.',
            'emotion': 'Emotion: Dark, intense, unsettled. The bass equivalent of a clenched jaw.',
            'whenUse': 'When to use: Choruses that need to escalate. As a mid-range layer over a sine sub for distorted pop. Eilish\'s "Bad Guy" chorus = layered distorted synths panned ±25–35% L/R over a clean sub. Not usually the solo bass.',
            'whenNot': 'When not to use: Warm or vulnerable tracks. Intimate singer-songwriter territory. It will fight the vocal.',
            'build': 'Build (Massive): OSC1 + OSC2 both on Sin-Tri-Saw wavetable. OSC1 detune +0.10, OSC2 −0.10. Filter1: Lowpass 4 at 500 Hz. FX1: Brauner Tube (drive 40%). FX2: Dimension Expander (for width in the mids only). Mono, legato.',
            'signalChain': 'Signal chain: Bandpass 200Hz–1.5kHz → Saturation → HPF on sub (keep sub as separate track) → Waves H-Comp.',
            'keyTip': 'Key tip: The original Reese had lo-fi gritty character from the Casio CZ\'s limitations. Don\'t over-clean it. A small amount of aliasing or noise in the upper harmonics is correct. Panning the distorted layers at ±25–35% rather than full L/R keeps a solid centre while creating width — this is the Finneas approach on "Bad Guy."',
            'references': 'References: Billie Eilish (Bad Guy chorus layer), DnB, Jungle.',
        },
        "meta": {
            'tag': 'Electronic'
        },
    },
    {
        "id": 'pluck-fm',
        "type": 'style',
        "title": 'Pluck / FM Bass',
        "oneLiner": 'One-liner: Short, punchy, melodic. Gets out of the way instantly.',
        "filters": ['electronic', 'dance'],
        "context": {
            "tempo": ["100-120", "120-135"],
            "density": ["medium", "dense"],
            "tone": ["euphoric", "anthemic"],
        },
        "sections": {
            'sound': 'Sound: Fast attack followed by almost immediate decay — like a pizzicato string or a marimba. Often has a bright, slightly metallic quality from FM modulation or filter resonance. The note appears and vanishes, leaving space for everything else. Very melodic character — you notice the note, not the sustain.',
            'emotion': 'Emotion: Playful, energetic, light-footed. Adds momentum without weight.',
            'whenUse': 'When to use: Busy arrangements where a sustained bass would cloud things up. Fast tempos. Tracks where the vocal or synth melody is already carrying the harmonic content and the bass just needs to mark the rhythm.',
            'whenNot': 'When not to use: Slow, emotive, or powerful tracks where you need weight and presence. Anything where the bass needs to be felt rather than heard.',
            'build': 'Build (Twin 3): Single saw oscillator. Filter envelope: Attack 0, Decay 120ms, Sustain 0%. Modulate filter cutoff from 200Hz → 1.5kHz with that envelope. Mono, light glide. For FM character: add OSC2 as FM modulator at low ratio (0.5–1.0) for a slight metallic click on the attack.',
            'signalChain': 'Signal chain: HPF 50Hz → Transient shaper (enhance attack) → Waves CLA-76 (fast, 4:1) → Waves Renaissance Bass.',
            'keyTip': 'Key tip: Edit MIDI note lengths to 40–50% of the beat. A pluck that rings too long loses its character and starts clouding the mix. The gap between notes is as important as the notes themselves.',
            'references': 'References: Calvin Harris (How Deep Is Your Love), Olivia Rodrigo (verses), dance-pop generally.',
        },
        "meta": {
            'tag': 'Electronic'
        },
    },
    {
        "id": 'analog-warm',
        "type": 'style',
        "title": 'Analog-Warm Synth Bass',
        "oneLiner": 'One-liner: Smooth, round, full. The synth version of a live bass.',
        "filters": ['electronic', 'soul', 'organic'],
        "context": {
            "tempo": ["80-100", "100-120"],
            "density": ["sparse", "medium"],
            "vocal": ["intimate", "low", "mid-range", "expressive"],
            "tone": ["warm", "soulful", "vulnerable", "intimate"],
        },
        "sections": {
            'sound': 'Sound: Warm rounded mid-range, no harsh edges. A full body through 100–400 Hz with a gentle top. Sounds almost like a bass guitar but with perfect consistency. Think Roland Juno-106, Moog Sub 37, Prophet-6. The note onset is slightly slow — it blooms in rather than arriving decisively.',
            'emotion': 'Emotion: Confident, full, musical. Sits in a track like it belongs there — never calling attention to itself.',
            'whenUse': 'When to use: Pop with retro DNA, funk-influenced productions, tracks where you want bass-guitar warmth without tracking live. Very vocal-friendly because it fills the low-mids without encroaching on the voice.',
            'whenNot': 'When not to use: When you need aggression or extreme electronic character.',
            'build': "Build (Twin 3): Single sawtooth or sine+square mix (50/50). 24 dB lowpass at 1.2 kHz — don't open it too wide or it loses warmth. Gentle filter envelope: small amount (20%), Decay 200ms. Amp envelope Attack 15ms — this is the key, the slightly slow onset is what sounds played rather than programmed. Internal drive/saturation at 20–25%. Mono, legato, 15–20ms glide. Sub octave blend at 35–40% for Moog-like fullness.\nSynth version (no live bass needed): This is exactly what Twin 3 is designed for. Add MIDI velocity variation manually — emphasis notes at 100, passing notes at 68. Edit note lengths to 80% of the beat. The combination of the slow amp attack, the sub octave, and the velocity variation produces a convincing organic feel without any live tracking.",
            'signalChain': 'Signal chain: Waves Scheps 73 (warm EQ) → Waves CLA-2A (slow, musical compression) → Waves J37 tape saturation → Waves Renaissance Bass.',
            'keyTip': 'Key tip: The slow attack on the amp envelope (10–20ms) is what makes it feel analog rather than digital. That rounded onset mimics how tube amplifiers behave. A 0ms attack on the same patch will sound immediately synthetic.',
            'references': 'References: Dua Lipa (Future Nostalgia), Bruno Mars, Anderson .Paak, Eilish (Birds of a Feather).',
        },
        "meta": {
            'tag': 'Electronic'
        },
    },
    {
        "id": 'mid-distorted',
        "type": 'style',
        "title": 'Mid-Range / Distorted Bass',
        "oneLiner": 'One-liner: Aggressive, growly, designed to compete with guitars.',
        "filters": ['electronic'],
        "context": {
            "tempo": ["120-135", "100-120"],
            "density": ["medium", "dense"],
            "tone": ["defiant", "intense", "euphoric", "anthemic"],
        },
        "sections": {
            'sound': 'Sound: Body lives in 200Hz–2kHz, deliberately leaving the sub for the kick drum. Distorted, edgy, present. Cuts through dense arrangements the way a guitar does. Often used as a layer over a clean sine sub — Finneas confirmed the chorus of "Bad Guy" uses "layered distorted synths panned left and right" over the sub, not a replacement for it.',
            'emotion': 'Emotion: Defiant, energetic, loud, confrontational. The bass equivalent of a power chord.',
            'whenUse': 'When to use: Rock-leaning pop, pop-punk, intense choruses. When the arrangement is already full and you need the bass to compete for attention rather than hide underneath.',
            'whenNot': 'When not to use: Anything delicate. Soul ballads. Intimate arrangements. It will overpower the vocal.',
            'build': "Build (Massive): Square-saw wavetable, bandpass filter (200Hz–2kHz), high saturation. Keep a separate pure sine sub track running simultaneously — the mid-range layer is not a replacement for the sub, it's an addition to it.",
            'signalChain': 'Signal chain: HPF 80Hz → Bandpass shape (200Hz–2kHz peak) → Hard saturation or distortion → Waves CLA-76 (fast, aggressive).',
            'keyTip': 'Key tip: Eilish panned distorted layers at ±25–35%, not full L/R. This creates width with a solid centre. Full-pan panning creates a hole in the middle of the stereo image.',
            'references': 'References: Billie Eilish (Bad Guy chorus), Olivia Rodrigo (good 4 u), rock-leaning pop.',
        },
        "meta": {
            'tag': 'Electronic'
        },
    },
    {
        "id": 'layered',
        "type": 'style',
        "title": 'Layered Bass (Sub + Mid)',
        "oneLiner": 'One-liner: The modern pop default. Two tracks, one job.',
        "filters": ['electronic', 'soul', 'dance'],
        "sections": {
            'sound': 'Sound: Not a single sound but two: one pure sub layer (felt, not heard, ≤100Hz), plus one character layer (the actual "sound" of the bass, above 120Hz). Together they cover the full range. Separately they\'re incomplete. Rob Bisel\'s approach on SZA\'s "Kill Bill": "The 89 Bass track is the recording of my electric guitar tuned down an octave, and there\'s a bass guitar track done by Carter and I. The sub-bass comes from the Waves RBass on the Bass Edit track" — three sources, one bass identity.',
            'emotion': 'Emotion: Whatever the character layer is — this is an approach, not a mood.',
            'whenUse': 'When to use: Almost always. This is the correct default for commercial pop, R&B, and indie.',
            'whenNot': 'When not to use: Extremely sparse arrangements where a single clean sound is the artistic point.',
            'build': "Build: Duplicate your MIDI to two instrument tracks. Track 1: init Massive or Operator to pure sine, low-pass at 100Hz, mono. Track 2: your character patch — analog warm, pluck, DI simulation, whatever the song needs. High-pass Track 2 at 80–120Hz so it doesn't double the sub energy. Group both to a bass bus. Process each independently then glue on the bus.\nSynth version: Twin 3 square wave + sub octave at 30%, LP at 1.8kHz, Attack 3ms, drive 15% = your character track. Duplicate it, remove all plugins, add only Waves RBass at 60Hz (mix 50%) = your sub track. HPF the character track at 80Hz. This is the same two-layer architecture as the Kill Bill record, built entirely in the box.",
            'signalChain': 'Signal chain: Sub track: HPF 30Hz → LP 100Hz → Waves RBass | Character track: HPF 80Hz → EQ → Compression → Saturation | Bus: Waves SSL G-Bus Compressor (2:1 glue) → Waves H-EQ.',
            'keyTip': 'Key tip: The crossover point (where sub ends and character begins) is usually 80–120Hz. Experiment — some tracks want 60Hz, some want 150Hz. Use a spectrum analyser and compare against your reference track.',
            'references': 'References: SZA (Kill Bill), Adele (Hello), most major label pop.',
        },
        "meta": {
            'tag': 'Electronic'
        },
    },
    {
        "id": 'live-di',
        "type": 'style',
        "title": 'Live / DI Bass Guitar',
        "oneLiner": 'One-liner: A real instrument — or something that sounds convincingly like one.',
        "filters": ['organic', 'soul'],
        "context": {
            "tempo": ["under 80", "80-100", "100-120"],
            "density": ["sparse", "medium"],
            "vocal": ["intimate", "low", "mid-range"],
            "tone": ["warm", "soulful", "vulnerable", "intimate"],
        },
        "sections": {
            'sound': 'Sound: The natural attack, sustain, and decay of real strings. Flatwounds sound dark and warm (Motown thump). Roundwounds sound bright and growly (funk). A pick gives a sharp click attack. Fingers give rounded warmth. No synth perfectly replicates this — but the Twin 3 approach below gets close enough for most contexts.',
            'emotion': 'Emotion: Human, warm, grounded. Signals that real people played this track.',
            'whenUse': 'When to use: Retro-soul, singer-songwriter pop with band identity, indie, R&B with organic warmth. Amy Winehouse\'s "Back to Black" — Movshon on a Ripper through tape compression — is the textbook example.',
            'whenNot': 'When not to use: Highly electronic or minimal productions where the contrast feels jarring.',
            'build': 'Build (real instrument): Record both DI and amp where possible. Phase-align DI and amp mic by nudging one by 0.5–2ms. For closet recording: DI only, then Waves SansAmp PSA-1 or GTR Bass amp simulation.\nSynth version (no live bass): Twin 3 — use a square wave oscillator, not saw. The hollow character of a square wave is closer to a plucked string than a continuous saw. Sub octave at 25%. LP at 1.8kHz — leave more high end than you think. Amp Attack 0–3ms for finger attack feel. Light internal drive 15%. Mono, legato, 8ms glide. Waves SansAmp PSA-1 after the synth (Bass 40%, Mid 50%, Treble 30%, Drive 25%) — this is the single most effective tool for making a synth bass sound like it went through an amp and DI simultaneously. Then Waves CLA-76: fast attack, 4:1, 3–5dB GR. MIDI velocity variation is non-negotiable — draw it manually, never leave two consecutive notes at the same velocity.',
            'signalChain': 'Signal chain: Waves SSL E-Channel (HPF 35Hz, boost 80Hz, cut 300Hz, boost 900Hz) → Waves CLA-76 (fast 4:1, 4–6dB GR) → Waves SansAmp PSA-1 (light drive) → Waves CLA-2A (slow, program-dependent).',
            'keyTip': 'Key tip: Cut 250–400Hz on every live bass track before doing anything else. That range accumulates mud. Removing it lets the vocal breathe and gives the bass more perceived punch, not less.',
            'references': 'References: Amy Winehouse (Back to Black — Nick Movshon on vintage Gibson Ripper tracked to tape), SZA (Kill Bill — Carter Lang + Rob Bisel on electric guitar tuned down + real bass guitar), Olivia Rodrigo (good 4 u — Ethan Gruska on driving bass), Sabrina Carpenter (Please Please Please).',
        },
        "meta": {
            'tag': 'Organic'
        },
    },
    {
        "id": 'sidechained',
        "type": 'style',
        "title": 'Sidechained / Pumping Bass',
        "oneLiner": 'One-liner: Breathes with the kick. The pulse that defines dance-pop.',
        "filters": ['dance', 'electronic'],
        "context": {
            "tempo": ["120-135", "100-120"],
            "density": ["medium", "dense"],
            "tone": ["euphoric", "anthemic"],
        },
        "sections": {
            'sound': 'Sound: A continuous pad-like synth bass that ducks on every kick hit and swells back between. The pumping motion is the point — it creates a sense of breathing, of energy rising and falling. Without the sidechain it would just be a static synth pad in the bass range. At 130 BPM the tempo is felt entirely in the low end.',
            'emotion': 'Emotion: Euphoric, driving, relentless. The sound of a dance floor working.',
            'whenUse': 'When to use: 125+ BPM. UK dance-pop, electropop, anything in the Chinchilla/Calvin Harris/Robyn lane. The pumping IS the chorus energy.',
            'whenNot': 'When not to use: Ballads, slow songs, intimate or vulnerable moments. It will make an emotional track feel clinical.',
            'build': 'Build (Massive): Two saw oscillators, slight detune (+0.08/−0.08), lowpass at 500Hz, gentle amp envelope with Sustain near 100%. Route through Ableton Compressor with external sidechain from the kick: ratio 6:1, attack 3–5ms, release timed to 1/16th note (~115ms at 130 BPM). Aim for 6–8dB of gain reduction on each kick hit.',
            'signalChain': 'Signal chain: Sidechain Compressor (6:1, kick trigger) → Waves Renaissance Bass → Chorus on HPF send (>200Hz only for width) → Waves Vitamin (upper mid presence).',
            'keyTip': "Key tip: Time the compressor release to the tempo. At 130 BPM, 1/16th note = ~115ms. If the release is too long, the bass never recovers between kicks and sounds limp. Too short and the pumping is too mechanical. Also: tune the session to the song's root note and tune your saw oscillators to that root — a harmonically incorrect bass makes the sidechain pumping feel sloppy rather than musical.",
            'references': 'References: Chinchilla (Cut You Off — 132 BPM, E minor, produced by mintsauce/Dominic Feil-Roots), Rihanna (We Found Love — Calvin Harris), Robyn, Charli XCX.',
        },
        "meta": {
            'tag': 'Dance'
        },
    },
]

TECHNIQUES = [
    {
        "id": 'parallel-compression',
        "type": 'technique',
        "title": 'Parallel Compression',
        "oneLiner": 'One-liner: Crush a duplicate, blend it back. Density without killing dynamics.',
        "filters": ['processing', 'mixing'],
        "sections": {
            'whatItDoes': 'What it does: The original signal stays dynamic and punchy. A heavily compressed duplicate — 10:1+ ratio, fast attack, almost no GR headroom — adds weight and density when blended in at 10–20%. The result is a bass that feels thick and present without sounding squashed.',
            'whenUse': "When to use: Live bass that's dynamic and has great moments but loses presence in the mix. Synth basses that need weight without artifacts. Any bass that sounds great solo but disappears in context.",
            'howToDo': 'How to do it: Create a send from the bass track to a new return. On the return: Waves CLA-76 at 10:1, attack full left (fastest), release full right (fastest). Drive the GR needle into the red. Blend the return at 15–25%. High-pass the parallel chain at 60Hz to prevent sub smearing.',
            'wavesPlugins': 'Waves plugins: Waves CLA-76 (Blacky setting), Waves dbx 160, Waves API 2500.',
            'keyTip': 'Key tip: The parallel chain can be a completely different character — different compressor, different saturation. The blending is the technique, not the specific plugin.',
        },
        "meta": {
            'category': 'Processing'
        },
    },
    {
        "id": 'sidechain-compression',
        "type": 'technique',
        "title": 'Sidechain Compression',
        "oneLiner": 'One-liner: The kick triggers a duck in the bass. Creates space and groove.',
        "filters": ['processing', 'mixing'],
        "sections": {
            'whatItDoes': 'What it does: Each kick hit causes the bass to briefly duck in level then swell back. Can range from subtle (just clearing headroom, barely audible) to overt (the pumping breath of Chinchilla, Robyn, Calvin Harris).',
            'whenUse': 'When to use: Any time kick and bass are fighting for the same frequency space. Essential in 125+ BPM dance-pop. Useful subtly in most pop and R&B as a headroom management tool.',
            'howToDo': "How to do it: Ableton Compressor → click Sidechain → select the kick track as input. Ratio 4:1–8:1. Attack 3–10ms. Release = 1/16th note at your tempo (at 130 BPM: ~115ms). Threshold until you get 4–8dB GR on each kick. High-pass the sidechain signal at 100Hz so the compressor only reacts to the kick's fundamental, not the full mix.",
            'wavesPlugins': 'Waves plugins: Waves SSL G-Channel, Waves C6 (multiband sidechain — more surgical).',
            'keyTip': 'Key tip: For subtle kick/bass separation rather than pumping: use Waves F6 Dynamic EQ. Set a dynamic cut at 60–100Hz sidechained to the kick. Only that band ducks, not the whole bass — much more transparent.',
        },
        "meta": {
            'category': 'Processing'
        },
    },
    {
        "id": 'harmonic-saturation',
        "type": 'technique',
        "title": 'Harmonic Saturation',
        "oneLiner": 'One-liner: Adds harmonics so the bass survives tiny speakers.',
        "filters": ['processing', 'mixing'],
        "sections": {
            'whatItDoes': 'What it does: Saturation generates overtones above the fundamental frequency. A 60Hz sine with saturation produces harmonics at 120Hz, 180Hz, 240Hz and so on — frequencies that phone speakers and laptops can actually reproduce. This is why a saturated bass "sounds big" on AirPods.',
            'whenUse': "When to use: Always. Any bass that's mostly sub frequencies needs harmonic content to translate. If you've listened on studio monitors and loved it, then played it on a phone and lost the bass completely — this is the fix.",
            'howToDo': 'How to do it: Waves MaxxBass or RBass on the bass channel. MaxxBass generates psychoacoustic harmonics without adding actual sub. RBass synthesises a pitched sub from the mid-range. Ableton Saturator: mode "Soft Sine," Drive 15–20%, keep Dry/Wet at 40–60%. Or frequency-specific saturation: high-pass the saturation plugin (kill below 200Hz) so only the upper bass gets harmonics.',
            'wavesPlugins': 'Waves plugins: Waves MaxxBass, Waves RBass, Waves H-Comp (adds saturation with compression).',
            'keyTip': 'Key tip: Apply saturation before the compressor so the compressor can respond to the new harmonic content. Or apply it in parallel to avoid affecting the fundamental too much.',
        },
        "meta": {
            'category': 'Processing'
        },
    },
    {
        "id": 'multiband-compression',
        "type": 'technique',
        "title": 'Multiband Compression',
        "oneLiner": 'One-liner: Compress different frequency bands independently. Surgical control.',
        "filters": ['processing', 'mixing'],
        "sections": {
            'whatItDoes': 'What it does: Instead of compressing the whole bass signal, you compress specific frequency ranges: sub separately from body, body separately from presence. Tighten the low end without crushing the mids.',
            'whenUse': 'When to use: Live bass with inconsistent dynamics across the frequency range. A bass that sounds balanced on the meter but has a boomy low end AND a thin upper range. Mastering chain. Bass bus glue.',
            'howToDo': 'How to do it: Waves C6: four bands — below 80Hz (gentle), 80–250Hz (tightest, where the mud lives), 250Hz–1kHz (gentle), above 1kHz (light). Start with all bands at ratio 2:1 and work up from there.',
            'wavesPlugins': 'Waves plugins: Waves C6 Multiband, Waves F6 Dynamic EQ (more transparent than C6).',
            'keyTip': "Key tip: F6's dynamic EQ is more transparent than C6's multiband compressor. For bass, use C6 for obvious shaping, F6 for subtle control and sidechain integration.",
        },
        "meta": {
            'category': 'Processing'
        },
    },
    {
        "id": 'mid-side-eq',
        "type": 'technique',
        "title": 'Mid-Side EQ',
        "oneLiner": 'One-liner: Process mono and stereo channels separately. Width without phase problems.',
        "filters": ['processing', 'mixing'],
        "sections": {
            'whatItDoes': 'What it does: M/S separates the mono (mid) signal from the stereo (side) signal. You can cut low frequencies on the side channel only — keeping sub frequencies perfectly mono — while adding warmth or saturation to the mids. Chorus or width on the side channel only means the sub stays centred and stable.',
            'whenUse': 'When to use: When you have a stereo character layer and need to ensure the sub stays mono. Adding width to a bass without creating phase problems. On the bass bus when mastering.',
            'howToDo': "How to do it: Waves S1 Imager or SSL G-Channel in M/S mode. Or Ableton's EQ Eight in M/S mode (switch at top from LR to MS). High-pass the Side channel at 150–200Hz — anything below that in the sides is phase-cancellation waiting to happen.",
            'wavesPlugins': 'Waves plugins: Waves S1 Imager, Waves SSL G-Channel, Waves Scheps 73 (M/S capable).',
            'keyTip': 'Key tip: The rule: keep bass mono below 150Hz, always. M/S EQ lets you enforce this surgically without affecting the full bass sound.',
        },
        "meta": {
            'category': 'Processing'
        },
    },
    {
        "id": 'sub-mid-splitting',
        "type": 'technique',
        "title": 'Sub / Mid Splitting',
        "oneLiner": 'One-liner: One pure sub. One character layer. Two tracks, one bass.',
        "filters": ['synthesis', 'mixing'],
        "sections": {
            'whatItDoes': 'What it does: The technique that underlies every major commercial pop bass. Sub layer (pure sine, ≤100Hz) handles the felt weight. Character layer (everything above 120Hz) handles the heard tone. Combined: the full bass sound that works on every system.',
            'whenUse': 'When to use: Your default starting point for any pop or R&B production. Always.',
            'howToDo': 'How to do it: Duplicate your MIDI to two instrument tracks. Track 1: init Massive or Operator to pure sine, low-pass at 100Hz, mono. Track 2: your character patch. High-pass Track 2 at 80–120Hz. Group both to a bass bus. Process independently then glue on the bus.',
            'wavesPlugins': 'Waves plugins: Waves RBass (can generate sub synthetically from the character track — the Kill Bill technique), Waves C6 (on the bus to control crossover behaviour).',
            'keyTip': "Key tip: You don't need to start with two synths. Duplicate the DI bass track and put Waves RBass on the duplicate to create a pure sub. One performance, two frequency layers.",
        },
        "meta": {
            'category': 'Synthesis'
        },
    },
    {
        "id": 'portamento-glide',
        "type": 'technique',
        "title": 'Portamento / Glide',
        "oneLiner": 'One-liner: Smooth pitch slide between notes. The difference between mechanical and musical.',
        "filters": ['synthesis', 'midi'],
        "context": {
            "tempo": ["under 80", "80-100"],
            "tone": ["vulnerable", "intimate", "warm", "melancholy", "cinematic"],
        },
        "sections": {
            'whatItDoes': 'What it does: When you move from one note to another, the pitch slides smoothly rather than jumping instantly. Subtle glide sounds like a human bassist sliding up the neck. More extreme glide becomes an obvious swooping effect.',
            'whenUse': 'When to use: Analog-warm or soul-style bass where notes move stepwise. Any synth bass that feels too "MIDI" and robotic. Used selectively on specific intervals rather than constantly.',
            'howToDo': 'How to do it: Massive: in the Voicing tab, set Glide to 10–30ms for subtle, 50–200ms for obvious. Twin 3: Portamento knob in the oscillator section. Key technique: automate the glide amount — engage it only on certain phrases for impact.',
            'wavesPlugins': 'Waves plugins: No plugin required — this is a synth parameter.',
            'keyTip': 'Key tip: Glide/portamento works best in legato mode (mono synth, notes overlap in MIDI). In non-legato mode each note re-triggers and the slide only happens when notes overlap.',
        },
        "meta": {
            'category': 'Synthesis'
        },
    },
    {
        "id": 'filter-envelope',
        "type": 'technique',
        "title": 'Filter Envelope Modulation',
        "oneLiner": 'One-liner: The filter opens and closes with each note. Gives bass movement and breath.',
        "filters": ['synthesis'],
        "context": {
            "tempo": ["100-120", "120-135"],
            "tone": ["euphoric", "anthemic", "defiant", "intense"],
        },
        "sections": {
            'whatItDoes': 'What it does: Each note triggers the filter to open (or close) on a shaped curve — the Attack, Decay, Sustain, Release of the filter envelope. A fast attack + medium decay makes the bass "talk" on each note. A slow attack creates a swell. Assigning negative modulation makes the filter close then open (inverted, darker start).',
            'whenUse': 'When to use: Any synth bass that sounds too static or lifeless. Pluck and FM basses rely on this entirely. Funk-style patterns where each note should feel dynamic.',
            'howToDo': 'How to do it: In Massive: Envelope 1 or 2 → assigned to Filter1 cutoff. Set envelope amount (~40–60 for moderate effect). For a pluck: set Decay to 100ms, Sustain to 0. For a wah-style: Decay 250ms, Sustain 30%.',
            'wavesPlugins': 'Waves plugins: Waves CLA-76 responds to the transient changes from the filter and can add extra punch to the note attack.',
            'keyTip': "Key tip: Negative filter envelope modulation is underused. Drag the mod amount below zero so the filter starts closed and opens on each note — creates a wah-forward effect that's distinctive.",
        },
        "meta": {
            'category': 'Synthesis'
        },
    },
    {
        "id": 'unison-detuning',
        "type": 'technique',
        "title": 'Unison / Detuning',
        "oneLiner": 'One-liner: Multiple voices slightly out of tune with each other. Thickness, width, movement.',
        "filters": ['synthesis'],
        "sections": {
            'whatItDoes': 'What it does: Multiple oscillator voices tuned slightly apart create beating — a subtle wobble or chorus effect. Extreme detuning = Reese bass. Subtle detuning = warmth and analog feel.',
            'whenUse': "When to use: When a bass sounds too static or thin in the mid-range. For Reese-style movement. For analog warmth that a single oscillator can't achieve.",
            'howToDo': 'How to do it: Massive: Voicing tab → Unison → set voices to 2–4. Detune 10–30 cents for warmth, 70–120 cents for Reese-style. Apply Dimension Expander in FX2 to spread the detuned voices in the stereo field — but high-pass at 150Hz so only the upper bass is widened.',
            'wavesPlugins': 'Waves plugins: Waves Doubler can add detune-style width to an audio bass track post-recording.',
            'keyTip': 'Key tip: Even voices left completely in centre benefit from small amounts of unison — it adds subtle warmth that makes the bass feel "bigger" without actually adding width.',
        },
        "meta": {
            'category': 'Synthesis'
        },
    },
    {
        "id": 'velocity-variation',
        "type": 'technique',
        "title": 'Velocity Variation',
        "oneLiner": 'One-liner: Uniform velocity sounds like a robot. Variation sounds like a person.',
        "filters": ['midi'],
        "sections": {
            'whatItDoes': 'What it does: Every MIDI note has a velocity value (0–127). When all notes are the same velocity, the bass sounds mechanical. Real bass players vary their attack constantly — accenting downbeats, ghosting passing notes, emphasising phrase peaks. That variation IS the groove.',
            'whenUse': 'When to use: Every single MIDI bass part. Always. No exceptions.',
            'howToDo': "How to do it: In Ableton: open the piano roll, look at the velocity lane at the bottom. Manually draw variation — emphasis notes at 100–110, passing notes at 60–75, ghost notes at 30–45. Or use Ableton's Velocity MIDI Effect with Random parameter set to 8–15 for subtle automatic variation.",
            'wavesPlugins': 'Waves plugins: No plugin — this is MIDI editing.',
            'keyTip': 'Key tip: The pattern of emphasis tells the story: in 4/4, the downbeat (beat 1) is usually the loudest. Beat 3 is second. Beats 2 and 4 are lighter. Eighth-notes between beats are the lightest. Start there and adjust by ear.',
        },
        "meta": {
            'category': 'MIDI'
        },
    },
    {
        "id": 'note-length-editing',
        "type": 'technique',
        "title": 'Note Length Editing',
        "oneLiner": "One-liner: Real bass players mute. Your MIDI probably doesn't.",
        "filters": ['midi'],
        "sections": {
            'whatItDoes': 'What it does: When all MIDI notes are full-length (note to note), they blur into each other. A real bassist mutes strings constantly — creating rhythmic space between notes. That space is what makes a groove feel tight. Shortening notes to 70–85% of their beat value recreates this.',
            'whenUse': 'When to use: All programmed bass. Especially important in funk-influenced patterns, fast passages, and anywhere the groove feels muddy or blurred.',
            'howToDo': 'How to do it: Select all notes in the piano roll. Manually drag note ends to around 80% of their start-to-start distance. Aim for a small visual gap between each note.',
            'wavesPlugins': 'Waves plugins: No plugin — pure MIDI editing.',
            'keyTip': 'Key tip: The exception is held notes over chord changes — those should be full length. Only shorten repetitive eighth or sixteenth note patterns, not long melodic phrases.',
        },
        "meta": {
            'category': 'MIDI'
        },
    },
    {
        "id": 'groove-swing',
        "type": 'technique',
        "title": 'Groove & Swing',
        "oneLiner": 'One-liner: Push certain notes slightly off the grid. Makes programmed bass feel alive.',
        "filters": ['midi'],
        "context": {
            "tempo": ["under 80", "80-100"],
            "tone": ["warm", "soulful", "vulnerable"],
        },
        "sections": {
            'whatItDoes': 'What it does: Swing pushes "even" 16th notes slightly later in time — the classic MPC/SP-1200 feel. The result is a subtly elastic, bouncing quality that makes people move.',
            'whenUse': 'When to use: Soul, R&B, funk-influenced bass. Any groove-driven production. Even in more electronic pop, a slight swing makes the pattern feel less robotic.',
            'howToDo': 'How to do it: Ableton Groove Pool: drag in a groove file (e.g. "MPC 16 Swing 67%"). Apply to the bass MIDI clip by dropping it onto the clip. Adjust the Timing amount to 50% and Velocity amount to 50% as a starting point.',
            'wavesPlugins': 'Waves plugins: No plugin — Ableton native feature.',
            'keyTip': 'Key tip: You can extract the groove from a drum loop and apply it to your bass — this locks them together in the same "pocket" without manual editing. Drag an audio clip onto the Groove Pool to extract its timing feel.',
        },
        "meta": {
            'category': 'MIDI'
        },
    },
    {
        "id": 'pitch-down-sources',
        "type": 'technique',
        "title": 'Pitch-Down Non-Bass Sources',
        "oneLiner": 'One-liner: Pitch a vocal, guitar, drum, or texture down to bass range. Unexpected results.',
        "filters": ['creative'],
        "sections": {
            'whatItDoes': 'What it does: Any sound pitched down 1–2 octaves can become a bass. A vocal phrase becomes a rumbling texture. A drum tom becomes a melodic bass hit. The result carries the character of the source material into the low end — organic, distinctive, impossible to replicate with a synth.',
            'whenUse': "When to use: When you want something that doesn't sound like a synth bass. When the track already sounds like every other production and you need to stand apart. When you want the bass to have a hidden melodic relationship to a lyric.",
            'howToDo': 'How to do it: Record or import audio. In Ableton Simpler: drop in the file, enable Complex Pro or Texture warp mode, pitch down −12 or −24 semitones. Loop a short section. Add a low-pass filter at 200Hz to keep only the bass frequencies. Tune to your key. Add saturation for harmonic content.',
            'wavesPlugins': 'Waves plugins: Waves SoundShifter (pitch shifting with formant control).',
            'keyTip': 'Key tip: Singing a simple one-note "aaah" or "mmm" and pitching it down gives you a uniquely warm, organic sub tone. The formant shift makes it sound like a completely different instrument.',
        },
        "meta": {
            'category': 'Creative'
        },
    },
    {
        "id": 'resampling',
        "type": 'technique',
        "title": 'Resampling',
        "oneLiner": "One-liner: Bounce your synth to audio, then mangle it. Complexity synthesis can't achieve.",
        "filters": ['creative', 'synthesis'],
        "sections": {
            'whatItDoes': 'What it does: Once a synthesised bass is rendered to audio, you can process it with anything — pitch-shift individual notes, reverse sections, apply granular effects, layer it back with the original. The result has the complexity of physical materials rather than the predictability of synthesis.',
            'whenUse': 'When to use: When a synth bass is close but not distinctive enough. When you want layered complexity without building a complicated patch. When you want to break out of the familiar sound of a known synthesiser.',
            'howToDo': 'How to do it: Build your bass patch in Massive. Record it to audio in Ableton (arm a new audio track, set input to Massive, record). Now treat the audio recording as raw material. Pitch it up or down. Reverse small sections. Apply granular effects (Ableton Granulator). Layer the audio back with the original MIDI synth at a low level.',
            'wavesPlugins': 'Waves plugins: Waves SoundShifter, Waves Infected Mushroom Pusher.',
            'keyTip': 'Key tip: Record the synth while you tweak parameters in real time — automate filter cutoff, resonance, LFO rate. Capture those movements as audio. The accidental moments are often the best.',
        },
        "meta": {
            'category': 'Creative'
        },
    },
    {
        "id": 'chorus-hpf-send',
        "type": 'technique',
        "title": 'Chorus on High-Pass Send',
        "oneLiner": 'One-liner: Width in the mids only. Sub stays mono and stable.',
        "filters": ['creative', 'processing'],
        "sections": {
            'whatItDoes': 'What it does: Routing the bass to a send with a chorus — but high-passing that send above 150–200Hz — adds stereo movement and warmth to the upper bass without touching the sub frequencies. The low end stays mono and punchy; the mids feel wide and alive.',
            'whenUse': 'When to use: When a bass sounds too narrow and centred. When you want Juno-style warmth and movement. Indie, dream-pop, retro-influenced productions.',
            'howToDo': 'How to do it: Create a return track in Ableton. Add HPF at 150Hz → Ableton Chorus (rate 0.2–0.4Hz, depth 15–25%) → bring return up to taste (usually around −12dB). The combination is subtle — it adds width, not an obvious effect.',
            'wavesPlugins': 'Waves plugins: Waves Doubler, Waves MetaFlanger (low-depth chorus mode).',
            'keyTip': 'Key tip: Try using a stereo detune effect instead of chorus: duplicate the bass send, pitch one copy +7 cents and pan left, another −7 cents and pan right. Even more subtle width without modulation.',
        },
        "meta": {
            'category': 'Creative'
        },
    },
    {
        "id": 'transient-shaping',
        "type": 'technique',
        "title": 'Transient Shaping',
        "oneLiner": 'One-liner: Control attack and sustain independently. Punch without mud.',
        "filters": ['creative', 'processing'],
        "sections": {
            'whatItDoes': "What it does: A transient shaper controls the attack portion of a sound independently from the body/sustain. Boosting attack = more click and definition at the note onset. Reducing sustain = tighter, cleaner notes that don't blur into each other.",
            'whenUse': 'When to use: A bass that has good tone but indistinct note attacks. A DI bass where the string attack is buried. A sub that blooms too long and clutters the mix.',
            'howToDo': 'How to do it: Waves Trans-X (Multi mode). Set the Low band (below 150Hz): reduce Sustain by 3–5dB to tighten the sub bloom. Increase Attack on the Mid band (150Hz–1kHz) by 2–3dB for note definition.',
            'wavesPlugins': 'Waves plugins: Waves Trans-X Multi (most useful for bass — multiband).',
            'keyTip': 'Key tip: For 808-style basses: be careful reducing sustain — the decaying pitch tail IS the sound. Instead, use slight attack increase to make the initial hit more percussive without shortening the tail.',
        },
        "meta": {
            'category': 'Creative'
        },
    },
    {
        "id": 'frequency-zoning',
        "type": 'technique',
        "title": 'Frequency Zoning (Kick + Bass)',
        "oneLiner": 'One-liner: Decide who owns the sub. Then give them that space exclusively.',
        "filters": ['mixing'],
        "sections": {
            'whatItDoes': 'What it does: The kick drum and bass occupy the same frequency territory. They will fight unless you assign ownership. Option A: Bass owns sub (40–80Hz), kick is a click (80Hz+). Option B: Kick owns sub, bass lives above 80Hz. There is no third option.',
            'whenUse': 'When to use: Always. Before you EQ, compress, or sidechain anything, decide this. The choice determines your entire low-end strategy.',
            'howToDo': 'How to do it: Listen to your reference track. Does the kick feel heavy or punchy? Heavy = kick owns the sub. Punchy = bass owns the sub. Then HPF accordingly — if bass owns sub, HPF the kick above 80Hz. If kick owns sub, HPF the bass above 60–80Hz and push its body to 100–250Hz.',
            'wavesPlugins': 'Waves plugins: Waves F6 (surgical dynamic EQ on the bass, triggered by kick sidechain on specific band).',
            'keyTip': 'Key tip: You can zone differently per section — kick owns sub in the verse (sparse, kick leads), bass owns sub in the chorus (full, bass-forward). Automate the HPFs.',
        },
        "meta": {
            'category': 'Mixing'
        },
    },
    {
        "id": 'mono-compatibility',
        "type": 'technique',
        "title": 'Mono Compatibility',
        "oneLiner": 'One-liner: Your mix will be played in mono. Test it throughout, not just at the end.',
        "filters": ['mixing'],
        "sections": {
            'whatItDoes': 'What it does: Phase problems in the low end cause frequencies to cancel when a stereo signal is summed to mono. Bluetooth speakers, phone speakers, and many club systems are mono or near-mono. A bass that disappears in mono is invisible to most listeners.',
            'whenUse': "When to use: Throughout the mixing process. Collapse to mono every 30 minutes and check the low end hasn't changed significantly.",
            'howToDo': "How to do it: Ableton: place a Utility plugin on the master with Width set to 0% (mono). Toggle on and off. The bass should feel similar in both states — slightly narrower in mono is fine, but shouldn't dramatically lose weight or clarity.",
            'wavesPlugins': 'Waves plugins: Waves S1 Imager (toggle mono), Waves PAZ Analyzer (shows mono correlation).',
            'keyTip': "Key tip: A quick phone speaker test tells you more than a mono meter. Play your mix on your iPhone speaker for 30 seconds. If the bass is there, you're good. If it's gone, there's a problem.",
        },
        "meta": {
            'category': 'Mixing'
        },
    },
    {
        "id": 'bass-bus-processing',
        "type": 'technique',
        "title": 'Bass Bus Processing',
        "oneLiner": 'One-liner: Group all bass tracks together. Process the combination, not the parts.',
        "filters": ['mixing'],
        "sections": {
            'whatItDoes': 'What it does: Routing sub and character layers to a shared bus lets you apply glue compression, overall EQ shaping, and saturation to the combined result rather than each element. The layers gel together into a single bass identity.',
            'whenUse': 'When to use: Whenever you have two or more bass tracks (sub + character, or any layered approach).',
            'howToDo': 'How to do it: In Ableton: group bass tracks (Ctrl+G). On the group track: Waves SSL G-Bus Compressor at 2:1, attack 30ms, release 100ms, 2dB GR max. Then Waves Scheps 73 for tone shaping. Then Waves H-EQ for final trimming.',
            'wavesPlugins': 'Waves plugins: Waves SSL G-Bus Compressor (glue), Waves H-EQ, Waves Scheps 73.',
            'keyTip': 'Key tip: Set up the bass bus before you start balancing levels between sub and character. The bus processing affects how they interact — balance after the glue, not before.',
        },
        "meta": {
            'category': 'Mixing'
        },
    },
    {
        "id": 'gain-staging',
        "type": 'technique',
        "title": 'Gain Staging',
        "oneLiner": 'One-liner: Output at the right level going into every plugin. Fix this first.',
        "filters": ['mixing'],
        "sections": {
            'whatItDoes': 'What it does: Plugins are calibrated to work best at specific input levels (usually around −18dBFS RMS or −12dBFS peak for analog emulations). Too hot into a compressor = heavy-handed artifacts. Too quiet into a saturator = no effect.',
            'whenUse': 'When to use: At the very start of every session, before any processing.',
            'howToDo': "How to do it: Set the bass instrument/track output so it peaks at around −12dBFS in the clip meter. Use Ableton's Utility or a gain plugin to trim at each stage. The goal: your mix channel fader sits near 0dB at the end.",
            'wavesPlugins': 'Waves plugins: Waves PAZ Analyzer, Waves VU Meter.',
            'keyTip': 'Key tip: The bass is often the biggest level problem because synths output hot. After your bass patch is done, trim the Massive master volume so it peaks at −12dBFS. Then you have headroom for everything that follows.',
        },
        "meta": {
            'category': 'Mixing'
        },
    },
]

CHARACTER = [
    {
        "id": 'warm',
        "type": 'character',
        "title": 'Warm',
        "oneLiner": 'Emphasis in 150–400Hz with gentle even-harmonic saturation.',
        "filters": ['character'],
        "context": {
            "tone": ["warm", "soulful", "vulnerable", "intimate"],
            "vocal": ["intimate", "low", "expressive"],
        },
        "sections": {
            'description': 'Emphasis in 150–400Hz with gentle even-harmonic saturation. Feels comforting, rounded, analogue. Associated with tube amps, tape, flatwound strings.',
            'why': "Why you'd want it: intimate or emotional tracks, retro-soul, singer-songwriter. When the vocal needs the bass to feel like a warm hand on the shoulder.",
            'how': 'How to get there: Twin 3 filter cutoff low (800Hz–1.2kHz). Boost 150–200Hz gently. Waves J37 tape saturation. Waves CLA-2A optical compression.',
            'reference': 'Reference: Amy Winehouse — Back to Black.',
            'helper': "If you don't know which you want: Ask — does the bass feel like a comfort or a statement? Comfort → warm. Statement → cold.",
        },
        "meta": {
            'pairId': 'warm-cold',
            'pole': 'left',
            'group': 'Tone',
            'poleName': 'Warm'
        },
    },
    {
        "id": 'cold',
        "type": 'character',
        "title": 'Cold',
        "oneLiner": 'Emphasis pulled toward 1–3kHz.',
        "filters": ['character'],
        "sections": {
            'description': 'Emphasis pulled toward 1–3kHz. Clear, defined, slightly detached. Associated with active electronics, digital precision, modern mixing.',
            'why': "Why you'd want it: dance-pop, contemporary R&B, tracks with dense high-frequency content where warmth would add mud.",
            'how': 'How to get there: Higher filter cutoff (2–4kHz). Cut 200–300Hz. No tape saturation. Clean CLA-76 fast compression.',
            'reference': 'Reference: Billie Eilish — bad guy.',
        },
        "meta": {
            'pairId': 'warm-cold',
            'pole': 'right',
            'group': 'Tone',
            'poleName': 'Cold'
        },
    },
    {
        "id": 'dark',
        "type": 'character',
        "title": 'Dark',
        "oneLiner": 'High-end rolled off above 1–2kHz.',
        "filters": ['character'],
        "context": {
            "tone": ["melancholy", "cinematic", "defiant", "intense"],
        },
        "sections": {
            'description': 'High-end rolled off above 1–2kHz. Full, heavy, covered. Reggae bass, Motown, dub. The note itself is the whole story.',
            'why': 'Why: genres or songs where the bass is a foundation, not a feature.',
            'how': 'How: LP filter at 800Hz–1kHz. Cut everything above 2kHz on EQ. Flatwound string simulation in Twin 3.',
            'reference': 'Reference: Lee "Scratch" Perry era reggae.',
            'helper': "If you don't know: does the bass need to be counted or felt? Counted → bright. Felt → dark.",
        },
        "meta": {
            'pairId': 'dark-bright',
            'pole': 'left',
            'group': 'Tone',
            'poleName': 'Dark'
        },
    },
    {
        "id": 'bright',
        "type": 'character',
        "title": 'Bright',
        "oneLiner": 'High-end present to 3–5kHz.',
        "filters": ['character'],
        "sections": {
            'description': 'High-end present to 3–5kHz. Attack clicks, string noise audible. Pick attack defined. More information per note.',
            'why': 'Why: funk, slap, busy arrangements where each note needs to cut through.',
            'how': 'How: LP filter open (2–4kHz). Boost 700Hz–1kHz on SSL E-Channel. Allow pick attack transient through.',
            'reference': 'Reference: Marcus Miller funk.',
        },
        "meta": {
            'pairId': 'dark-bright',
            'pole': 'right',
            'group': 'Tone',
            'poleName': 'Bright'
        },
    },
    {
        "id": 'fat',
        "type": 'character',
        "title": 'Fat',
        "oneLiner": 'Emphasis in 80–250Hz with body and substance.',
        "filters": ['character'],
        "sections": {
            'description': 'Emphasis in 80–250Hz with body and substance. Takes up physical space in the mix. Warm, substantial, full.',
            'why': 'Why: sparse arrangements, slow tempos, when the bass is doing emotional heavy lifting.',
            'how': 'How: boost 100–200Hz on EQ. Sub octave blend in Twin 3. Waves Renaissance Bass for perceived weight.',
            'reference': 'Reference: Anderson .Paak soul tracks.',
            'helper': "If you don't know: is the kick doing the heavy lifting or is the bass? If the kick is the main event, go thin. If the bass is the main event, go fat.",
        },
        "meta": {
            'pairId': 'fat-thin',
            'pole': 'left',
            'group': 'Tone',
            'poleName': 'Fat'
        },
    },
    {
        "id": 'thin',
        "type": 'character',
        "title": 'Thin',
        "oneLiner": 'Minimal low-mid content.',
        "filters": ['character'],
        "sections": {
            'description': 'Minimal low-mid content. Light, focused, present in upper frequencies. Sits on top of the mix rather than underneath it.',
            'why': 'Why: dense busy mixes where fat bass would clog the low-mids. When the kick is carrying the low end and the bass is providing definition.',
            'how': 'How: HPF higher than usual (80–100Hz). Cut 150–250Hz. Lean into upper harmonics from saturation.',
            'reference': 'Reference: hyperpop production.',
        },
        "meta": {
            'pairId': 'fat-thin',
            'pole': 'right',
            'group': 'Tone',
            'poleName': 'Thin'
        },
    },
    {
        "id": 'full',
        "type": 'character',
        "title": 'Full',
        "oneLiner": 'Mid-range between 250Hz–1kHz is present and contributing.',
        "filters": ['character'],
        "sections": {
            'description': 'Mid-range between 250Hz–1kHz is present and contributing. No scoop. The note has body all the way through the frequency range.',
            'why': 'Why: when the bass is a featured element, when the arrangement has space for it, when the song has no guitar filling that range.',
            'how': 'How: flat or gentle mid-range boost on EQ. No scoop. Filter cutoff stays open.',
            'reference': "Reference: Pino Palladino with D'Angelo.",
            'helper': "If you don't know: does your arrangement have guitars or keys filling the 300–700Hz range? If yes, go hollow. If the bass is the only thing there, go full.\nTexture group:",
        },
        "meta": {
            'pairId': 'full-hollow',
            'pole': 'left',
            'group': 'Tone',
            'poleName': 'Full'
        },
    },
    {
        "id": 'hollow',
        "type": 'character',
        "title": 'Hollow/Scooped',
        "oneLiner": 'Mids scooped out — strong sub and some high-end, but a gap in 250Hz–1kHz.',
        "filters": ['character'],
        "sections": {
            'description': 'Mids scooped out — strong sub and some high-end, but a gap in 250Hz–1kHz. The smiley face EQ. Feels wide and spacious but less warm.',
            'why': 'Why: when competing with guitars that live in the same mid-range. When the mix is congested and the bass needs to step back.',
            'how': 'How: cut 300–600Hz on EQ with moderate Q. Boost 60–80Hz for sub, allow top end through for definition.',
            'reference': 'Reference: Marcus Miller slap bass.',
        },
        "meta": {
            'pairId': 'full-hollow',
            'pole': 'right',
            'group': 'Tone',
            'poleName': 'Hollow/Scooped'
        },
    },
    {
        "id": 'smooth',
        "type": 'character',
        "title": 'Smooth',
        "oneLiner": 'No saturation or distortion.',
        "filters": ['character'],
        "sections": {
            'description': 'No saturation or distortion. The note is pure. Sustains cleanly. Associated with pristine digital production or well-controlled analog.',
            'why': 'Why: when the bass should be invisible — supportive, stable, reliable. Emotional ballads where grit would feel wrong.',
            'how': 'How: no saturation plugins. Clean compressor (F6 rather than CLA-76).',
            'reference': 'Reference: clean synth pop, Robyn.',
            'helper': "If you don't know: would you describe this song as polished or raw? Polished → smooth. Raw → gritty.",
        },
        "meta": {
            'pairId': 'smooth-gritty',
            'pole': 'left',
            'group': 'Texture',
            'poleName': 'Smooth'
        },
    },
    {
        "id": 'gritty',
        "type": 'character',
        "title": 'Gritty',
        "oneLiner": 'Saturation, harmonic distortion, or overdrive.',
        "filters": ['character'],
        "sections": {
            'description': 'Saturation, harmonic distortion, or overdrive. Roughness in the upper harmonics. Feels worked, imperfect, physical.',
            'why': 'Why: when the bass needs character and presence. When the vocal is raw and the bass should match.',
            'how': 'How: Waves J37 tape or SansAmp PSA-1. Ableton Saturator 20–40% drive.',
            'reference': 'Reference: Stones-era rock bass, Amy Winehouse.',
        },
        "meta": {
            'pairId': 'smooth-gritty',
            'pole': 'right',
            'group': 'Texture',
            'poleName': 'Gritty'
        },
    },
    {
        "id": 'pristine',
        "type": 'character',
        "title": 'Pristine',
        "oneLiner": 'Full frequency response, no noise, no artefacts.',
        "filters": ['character'],
        "sections": {
            'description': 'Full frequency response, no noise, no artefacts. Sounds like it was recorded today in a professional studio.',
            'why': 'Why: when production quality is part of the artistic statement. Contemporary pop, electropop.',
            'how': 'How: clean signal chain. No tape emulation. Waves SSL or API channel strip. Linear phase EQ.',
            'reference': 'Reference: Dua Lipa Future Nostalgia.',
            'helper': "If you don't know: what decade does this song want to feel like it's from? Contemporary → pristine. Retro or bedroom → lo-fi.",
        },
        "meta": {
            'pairId': 'pristine-lofi',
            'pole': 'left',
            'group': 'Texture',
            'poleName': 'Pristine'
        },
    },
    {
        "id": 'lo-fi',
        "type": 'character',
        "title": 'Lo-fi',
        "oneLiner": 'High end rolled off, subtle noise floor, tape-degraded transients.',
        "filters": ['character'],
        "sections": {
            'description': 'High end rolled off, subtle noise floor, tape-degraded transients. Sounds like it was recorded in 1972 or in a bedroom.',
            'why': 'Why: nostalgia, intimacy, rawness. When the lo-fi quality signals authenticity and effort.',
            'how': 'How: Waves J37 at moderate drive. Cut above 6kHz. Deliberate slight timing imprecision in MIDI.',
            'reference': 'Reference: Clairo Immunity.',
        },
        "meta": {
            'pairId': 'pristine-lofi',
            'pole': 'right',
            'group': 'Texture',
            'poleName': 'Lo-fi'
        },
    },
    {
        "id": 'dry',
        "type": 'character',
        "title": 'Dry',
        "oneLiner": 'Strong fundamental with minimal overtones.',
        "filters": ['character'],
        "sections": {
            'description': 'Strong fundamental with minimal overtones. The note is clearly itself — no added character. What the oscillator is, the output is.',
            'why': 'Why: when the bass should be tonally neutral — a foundation without opinion. When the mix is already harmonically rich.',
            'how': 'How: no saturation plugins. Clean chain. Simple sine oscillator in Massive.',
            'reference': 'Reference: pure sine sub under a track.',
            'helper': "If you don't know: does the bass need to be neutral or does it need character? Neutral → dry. Character → saturated.",
        },
        "meta": {
            'pairId': 'dry-saturated',
            'pole': 'left',
            'group': 'Texture',
            'poleName': 'Dry'
        },
    },
    {
        "id": 'saturated',
        "type": 'character',
        "title": 'Saturated',
        "oneLiner": 'Even-harmonic or odd-harmonic additions above the fundamental.',
        "filters": ['character'],
        "sections": {
            'description': 'Even-harmonic or odd-harmonic additions above the fundamental. Richer, more complex, fuller perceived sound.',
            'why': 'Why: when the bass needs to feel warm, present, alive. Fighting for perceived loudness without increasing actual level.',
            'how': 'How: Waves H-Comp. Ableton Saturator Soft Sine 20%. Waves Renaissance Bass. Stack gently.',
            'reference': 'Reference: vintage Motown bass — harmonic from strings and amp.',
        },
        "meta": {
            'pairId': 'dry-saturated',
            'pole': 'right',
            'group': 'Texture',
            'poleName': 'Saturated'
        },
    },
    {
        "id": 'vintage',
        "type": 'character',
        "title": 'Vintage',
        "oneLiner": 'Rounded transients, slight compression from tape, warm mid-range emphasis (125–200Hz), high-end naturally rolled off above 5kHz.',
        "filters": ['character'],
        "sections": {
            'description': 'Rounded transients, slight compression from tape, warm mid-range emphasis (125–200Hz), high-end naturally rolled off above 5kHz. Sounds like it was recorded through physical equipment that had opinions.',
            'why': 'Why: soul, R&B, any track drawing emotional power from feeling like it belongs to a human moment.',
            'how': 'How: Waves J37 tape. CLA-2A optical compression. Cut above 5kHz. Apply Ableton Groove Pool swing at 50%.',
            'reference': 'Reference: Dap-Kings era Winehouse, Leon Bridges.',
            'helper': "If you don't know: does the song want to feel nostalgic or forward-looking? Nostalgic → vintage. Forward-looking → modern.\nCharacter group:",
        },
        "meta": {
            'pairId': 'vintage-modern',
            'pole': 'left',
            'group': 'Texture',
            'poleName': 'Vintage'
        },
    },
    {
        "id": 'modern',
        "type": 'character',
        "title": 'Modern',
        "oneLiner": 'Tight controlled transients, extended high-end to 10kHz+, precise dynamics, slightly scooped mid-range.',
        "filters": ['character'],
        "sections": {
            'description': 'Tight controlled transients, extended high-end to 10kHz+, precise dynamics, slightly scooped mid-range. Sounds optimised.',
            'why': 'Why: dance-pop, contemporary pop, anything that should feel current.',
            'how': 'How: no tape emulation. Clean CLA-76 or F6 compression. Full high-frequency content. Tight quantised MIDI. Sub + mid layering for precision.',
            'reference': 'Reference: Dua Lipa, Charli XCX.',
        },
        "meta": {
            'pairId': 'vintage-modern',
            'pole': 'right',
            'group': 'Texture',
            'poleName': 'Modern'
        },
    },
    {
        "id": 'growly',
        "type": 'character',
        "title": 'Growly',
        "oneLiner": 'Interaction between the fundamental and harmonics in the 800Hz–1.',
        "filters": ['character'],
        "sections": {
            'description': 'Interaction between the fundamental and harmonics in the 800Hz–1.5kHz range creates a distinctive growl — as if the bass is straining against itself. Associated with Warwick basses, certain amp settings, specific filter resonance.',
            'why': 'Why: when the bass needs personality and presence. When the arrangement has space for character. R&B, funk, alt-pop.',
            'how': 'How: boost 800Hz–1.2kHz on EQ with moderate Q. Light saturation (even-harmonic) to generate harmonics that interact. Slight filter resonance in Massive.',
            'reference': 'Reference: Jaco Pastorius jazz fusion.',
            'helper': "If you don't know: is the bass the instrument or the foundation? Instrument → growly. Foundation → neutral.",
        },
        "meta": {
            'pairId': 'growly-neutral',
            'pole': 'left',
            'group': 'Character',
            'poleName': 'Growly'
        },
    },
    {
        "id": 'neutral',
        "type": 'character',
        "title": 'Neutral',
        "oneLiner": 'The note is simply itself.',
        "filters": ['character'],
        "sections": {
            'description': 'The note is simply itself. No harmonic character competing for attention. Clean, stable, workmanlike.',
            'why': 'Why: when the bass should disappear into the track. Pop production where the vocal is the sole personality.',
            'how': 'How: flat EQ in the upper bass. No saturation. Clean compression. Let the fundamental carry the note alone.',
            'reference': 'Reference: clean pop session bass.',
        },
        "meta": {
            'pairId': 'growly-neutral',
            'pole': 'right',
            'group': 'Character',
            'poleName': 'Neutral'
        },
    },
    {
        "id": 'punchy',
        "type": 'character',
        "title": 'Punchy',
        "oneLiner": 'The attack portion of the note is accentuated — you hear the note arrive decisively.',
        "filters": ['character'],
        "sections": {
            'description': 'The attack portion of the note is accentuated — you hear the note arrive decisively. Decay is quick. Each note feels like a tap.',
            'why': 'Why: funk, dance, anything that needs rhythmic energy and presence. When the bassline is a rhythmic driver.',
            'how': 'How: fast amp attack (0–5ms). Transient shaper: boost attack. CLA-76 fast attack. HPF any sub bloom.',
            'reference': 'Reference: Sly and the Family Stone.',
            'helper': "If you don't know: should you feel the groove through your feet or your chest? Feet → punchy. Chest → soft.",
        },
        "meta": {
            'pairId': 'punchy-soft',
            'pole': 'left',
            'group': 'Character',
            'poleName': 'Punchy'
        },
    },
    {
        "id": 'soft',
        "type": 'character',
        "title": 'Soft',
        "oneLiner": 'Attack is rounded or slow.',
        "filters": ['character'],
        "sections": {
            'description': 'Attack is rounded or slow. The note blooms in rather than arrives. Each note feels like a breath.',
            'why': 'Why: ballads, pads, anything where the bass should feel like support rather than statement.',
            'how': 'How: slow amp attack (15–30ms). Ableton Saturator adds even harmonics that smooth the onset. CLA-2A slow optical compression.',
            'reference': 'Reference: Portishead trip-hop bass.',
        },
        "meta": {
            'pairId': 'punchy-soft',
            'pole': 'right',
            'group': 'Character',
            'poleName': 'Soft'
        },
    },
    {
        "id": 'tight',
        "type": 'character',
        "title": 'Tight',
        "oneLiner": 'Sub frequencies decay quickly after each note.',
        "filters": ['character'],
        "sections": {
            'description': 'Sub frequencies decay quickly after each note. The mix feels clean, controlled, nothing lingers. Works with fast kick patterns.',
            'why': 'Why: fast tempos, dance-pop, any mix where clarity is more important than weight.',
            'how': 'How: transient shaper: reduce Sustain on low band 3–5dB. HPF at 50Hz. Fast compressor release.',
            'reference': 'Reference: drum and bass sub bass.',
            'helper': "If you don't know: what tempo is this track? Above 120 BPM → tight. Below 90 BPM → bloomy. In between → try both and listen.\nMovement group:",
        },
        "meta": {
            'pairId': 'tight-bloomy',
            'pole': 'left',
            'group': 'Character',
            'poleName': 'Tight'
        },
    },
    {
        "id": 'bloomy',
        "type": 'character',
        "title": 'Bloomy',
        "oneLiner": 'Sub frequencies sustain and swell.',
        "filters": ['character'],
        "sections": {
            'description': 'Sub frequencies sustain and swell. Each note has a tail. The mix feels full, spacious.',
            'why': 'Why: slow emotional tracks, ambient, anything where the weight of the bass is meant to linger between notes.',
            'how': 'How: allow full sub decay. Slow compressor release. No transient sustain reduction. LP filter set low to allow the fundamental to bloom fully.',
            'reference': 'Reference: James Blake production bass.',
        },
        "meta": {
            'pairId': 'tight-bloomy',
            'pole': 'right',
            'group': 'Character',
            'poleName': 'Bloomy'
        },
    },
    {
        "id": 'static',
        "type": 'character',
        "title": 'Static',
        "oneLiner": 'The bass sounds the same on every note, every bar.',
        "filters": ['character'],
        "sections": {
            'description': 'The bass sounds the same on every note, every bar. Stable, reliable, consistent. Like a metronome in the low end.',
            'why': 'Why: when stability is the point. Ambient, minimalist, anything where movement would be distracting.',
            'how': 'How: no LFO modulation. No filter automation. Consistent velocity. Tight quantise.',
            'reference': 'Reference: Philip Glass minimalist compositions.',
            'helper': "If you don't know: is this track meant to hypnotise or to surprise? Hypnotise → static. Surprise → alive.",
        },
        "meta": {
            'pairId': 'static-alive',
            'pole': 'left',
            'group': 'Movement',
            'poleName': 'Static'
        },
    },
    {
        "id": 'alive',
        "type": 'character',
        "title": 'Alive',
        "oneLiner": 'The bass shifts — filter movement, slight pitch modulation, LFO-driven tremolo, envelope animation.',
        "filters": ['character'],
        "sections": {
            'description': 'The bass shifts — filter movement, slight pitch modulation, LFO-driven tremolo, envelope animation. Each note feels slightly different.',
            'why': 'Why: when the bass needs to feel like something living is playing it. Soul, funk, indie.',
            'how': 'How: LFO on filter cutoff (0.1–0.5Hz, depth 10–20%). Velocity variation. Groove pool swing. Light portamento.',
            'reference': 'Reference: Thundercat bass playing.',
        },
        "meta": {
            'pairId': 'static-alive',
            'pole': 'right',
            'group': 'Movement',
            'poleName': 'Alive'
        },
    },
    {
        "id": 'stable',
        "type": 'character',
        "title": 'Stable',
        "oneLiner": 'The bass stays on root notes, moves only when harmony changes.',
        "filters": ['character'],
        "sections": {
            'description': 'The bass stays on root notes, moves only when harmony changes. Provides a foundation under everything else.',
            'why': 'Why: dense arrangements, vocal-forward productions. When the listener should never think about the bass.',
            'how': 'How: root-note only MIDI. Half-note or whole-note patterns. No fills.',
            'reference': 'Reference: Adele Hello verse bass.',
            'helper': "If you don't know: how many other elements are in the arrangement? Many elements → stable. Sparse arrangement → restless.\nMix Position group:",
        },
        "meta": {
            'pairId': 'stable-restless',
            'pole': 'left',
            'group': 'Movement',
            'poleName': 'Stable'
        },
    },
    {
        "id": 'restless',
        "type": 'character',
        "title": 'Restless',
        "oneLiner": 'The bass moves between chord tones and passing tones, creates counter-melody, has its own rhythmic and melodic agenda.',
        "filters": ['character'],
        "sections": {
            'description': 'The bass moves between chord tones and passing tones, creates counter-melody, has its own rhythmic and melodic agenda.',
            'why': 'Why: when the bass is a featured instrument. Jazz-influenced pop, R&B where the bass is part of the conversation.',
            'how': "How: chord tones on strong beats, passing tones on weak beats. Fills at phrase ends. Pull from the vocal's rhythmic gaps.",
            'reference': 'Reference: Paul McCartney melodic bass lines.',
        },
        "meta": {
            'pairId': 'stable-restless',
            'pole': 'right',
            'group': 'Movement',
            'poleName': 'Restless'
        },
    },
    {
        "id": 'present',
        "type": 'character',
        "title": 'Present',
        "oneLiner": 'You can distinctly hear the bass as its own element.',
        "filters": ['character'],
        "sections": {
            'description': "You can distinctly hear the bass as its own element. The mix wouldn't be the same without it being specifically there.",
            'why': 'Why: when the bass is part of the hook, or when the arrangement is sparse enough for it to be featured.',
            'how': 'How: higher level in mix. More mid-range content. Compression maintaining consistent level. Less sidechain ducking.',
            'reference': 'Reference: Motown bass — audible hook.',
            'helper': "If you don't know: could you hum the bassline back after one listen? If yes → it should probably be present. If no → it should probably be recessed.",
        },
        "meta": {
            'pairId': 'present-recessed',
            'pole': 'left',
            'group': 'Mix Position',
            'poleName': 'Present'
        },
    },
    {
        "id": 'recessed',
        "type": 'character',
        "title": 'Recessed',
        "oneLiner": 'The bass is felt more than heard — contributing weight and foundation without announcing itself.',
        "filters": ['character'],
        "sections": {
            'description': 'The bass is felt more than heard — contributing weight and foundation without announcing itself.',
            'why': 'Why: dense arrangements, vocal-forward productions, when the mix is already complex.',
            'how': 'How: lower level. Less upper harmonic content. More sub, less mid. More sidechain ducking from kick. EQ cut at 300–500Hz.',
            'reference': 'Reference: Adele Hello — supportive weight.',
        },
        "meta": {
            'pairId': 'present-recessed',
            'pole': 'right',
            'group': 'Mix Position',
            'poleName': 'Recessed'
        },
    },
    {
        "id": 'forward',
        "type": 'character',
        "title": 'Forward',
        "oneLiner": 'The bass has its own melodic or rhythmic identity.',
        "filters": ['character'],
        "sections": {
            'description': 'The bass has its own melodic or rhythmic identity. It does things you notice and remember.',
            'why': 'Why: bass-forward R&B, funk, jazz-influenced pop. When the bass is the instrument.',
            'how': 'How: melodic bassline writing. Higher in mix. Let the character layer be audible. Allow more mid-range body.',
            'reference': 'Reference: Thundercat, Flea, Pino Palladino.',
            'helper': "If you don't know: is the bass player the feature or the backbone of this song? Feature → forward. Backbone → supportive.",
        },
        "meta": {
            'pairId': 'forward-supportive',
            'pole': 'left',
            'group': 'Mix Position',
            'poleName': 'Forward'
        },
    },
    {
        "id": 'supportive',
        "type": 'character',
        "title": 'Supportive',
        "oneLiner": 'The bass is always in service of something else — the vocal, the kick, the chord progression.',
        "filters": ['character'],
        "sections": {
            'description': 'The bass is always in service of something else — the vocal, the kick, the chord progression. It never draws attention to itself.',
            'why': 'Why: singer-songwriter pop, ballads. When the listener should never think about the bass.',
            'how': 'How: root-note patterns. Keep in the sub. Sidechain to kick. Cut 300Hz. Let it disappear under the vocal.',
            'reference': 'Reference: pop session bass on any Adele record.',
        },
        "meta": {
            'pairId': 'forward-supportive',
            'pole': 'right',
            'group': 'Mix Position',
            'poleName': 'Supportive'
        },
    },
    {
        "id": 'muddy',
        "type": 'character',
        "title": 'Muddy',
        "oneLiner": 'Individual notes are hard to distinguish.',
        "filters": ['character'],
        "sections": {
            'description': "Individual notes are hard to distinguish. Low frequencies blur together. The mix feels heavy but undefined. Usually a problem, occasionally a deliberate aesthetic (dub, certain hip-hop). Why you'd want it intentionally: dub reggae, psychedelic production where density is the point.",
            'why': '',
            'how': 'How: allow notes to ring over each other. Boost 200–300Hz. Remove HPF.',
            'reference': 'Reference: dub reggae (intentional).',
            'helper': "If you don't know: try the mono check. Collapse your mix to mono. If the low end becomes more defined in mono — you have phase issues causing mud. If it stays muddy — you have a frequency accumulation problem.",
        },
        "meta": {
            'pairId': 'muddy-clean',
            'pole': 'left',
            'group': 'Mix Position',
            'poleName': 'Muddy'
        },
    },
    {
        "id": 'clean',
        "type": 'character',
        "title": 'Clean',
        "oneLiner": 'Each bass note is distinct.',
        "filters": ['character'],
        "sections": {
            'description': 'Each bass note is distinct. The low end has clarity — you can count the notes. The mix has definition even at low volume.',
            'why': 'Why: almost always. Clean low end gives the rest of the mix room to exist.',
            'how': 'How: HPF at 40–60Hz. Cut 200–300Hz on bass. Edit MIDI note lengths to 80%. Sidechain kick to bass. Mono below 150Hz.',
            'reference': 'Reference: every commercial pop mix.',
        },
        "meta": {
            'pairId': 'muddy-clean',
            'pole': 'right',
            'group': 'Mix Position',
            'poleName': 'Clean'
        },
    },
]

WRITING = [
    {
        "id": 'writing-01',
        "type": 'writing',
        "title": '01 — Root vs Non-Root Movement',
        "oneLiner": 'The most fundamental writing decision. A root-note bassline stays on the root of each chord — almost invisible to the li',
        "filters": ['writing'],
        "sections": {
            'body': 'The most fundamental writing decision. A root-note bassline stays on the root of each chord — almost invisible to the listener. A non-root bassline moves between chord tones, passing tones, and chromatic approach notes — it\'s a featured instrument. Both are valid, but they serve completely different functions and communicate completely different things.\nRoot-note bass is the foundation of most commercial pop. It would be wrong any other way on a track like Adele\'s "Hello" — the vocal is the entire story. The bass\'s job is to stay out of the way and anchor the harmony.\nNon-root bass has opinions. Paul McCartney\'s bass on Beatles records is melodically active and memorable — "Something," "Come Together," "With a Little Help From My Friends" all have bass lines that are independently musical. Pino Palladino\'s work with D\'Angelo and John Mayer creates counter-melodies that are as memorable as the vocal.\nRule: if the listener should be thinking about the bass, use non-root movement. If the listener should never think about it, stay on roots.\nFor vocal-led singer-songwriter production like Cycles: root on the downbeat, non-root on passing notes within the bar, root again at the next chord change. This gives harmonic clarity while adding subtle movement that makes the arrangement feel alive.',
        },
        "meta": {
        },
    },
    {
        "id": 'writing-02',
        "type": 'writing',
        "title": '02 — Rhythm and the Pocket',
        "oneLiner": 'The rhythm of the bassline determines the energy of the track more than any other single decision. A whole-note bass (on',
        "filters": ['writing'],
        "sections": {
            'body': 'The rhythm of the bassline determines the energy of the track more than any other single decision. A whole-note bass (one note per bar) feels sparse and open. A straight eighth-note bass (eight notes per bar) feels busy and driving. Where between those poles you sit determines whether the track breathes or pushes.\nThe "pocket" is where the bass and kick drum lock together. The classic pocket in most pop and R&B: bass hits on beat 1 and usually beat 3, with the kick drum hitting on beats 1 and 3 (or in syncopated variations around them). When the bass and kick hit the same note at the same time, the low end feels unified and powerful. When intentionally offset, you get rhythmic tension.\nTry this: write your bassline by looking at the kick pattern first. Where does the kick hit? Put a bass note there. Then add one more note between those kicks at roughly 80% velocity. That\'s your starting rhythm.\nThe most common mistake in programmed bass: putting a note on every single beat and subdividing constantly. Real bass players breathe — they leave space. Write space deliberately.',
        },
        "meta": {
        },
    },
    {
        "id": 'writing-03',
        "type": 'writing',
        "title": '03 — Following the Vocal',
        "oneLiner": "In vocal-led music, the bass and vocal are in constant conversation — even when it's not obvious. The bass should genera",
        "filters": ['writing'],
        "sections": {
            'body': "In vocal-led music, the bass and vocal are in constant conversation — even when it's not obvious. The bass should generally leave space where the vocal is most active, and move where the vocal breathes or rests.\nRegister matters enormously. If you sing in chest voice below G3 (roughly), your voice and the upper bass occupy the same frequency range. A busy or present bass in that register will compete directly with your voice for the listener's attention — and you'll both lose. This is why Eilish's bass is almost always in the sub range during verses: her voice sits low, and the bass has to get out of the way.\nPractical test: record yourself singing the vocal. Look at the spectral content in Ableton's spectrum analyser. Where does your voice spend most of its time? Now look at where the bass lives. If they overlap significantly — you have a problem.\nThe other consideration is rhythm. If your vocal has a lot of syllables and movement in a bar, the bass should be simpler — a counter-weight rather than a mirror. If your vocal is a held note over several beats, the bass can be more active and melodic underneath it.",
        },
        "meta": {
        },
    },
    {
        "id": 'writing-04',
        "type": 'writing',
        "title": '04 — Static vs Active Basslines',
        "oneLiner": 'A static bassline plays the same pattern every bar. An active bassline fills, varies, and responds bar to bar. Neither i',
        "filters": ['writing'],
        "sections": {
            'body': 'A static bassline plays the same pattern every bar. An active bassline fills, varies, and responds bar to bar. Neither is better — they serve different emotional functions.\nStatic basslines build tension and hypnosis through repetition. A single repeated pattern that locks with the kick creates inevitability — the listener stops hearing the bass as a melody and starts feeling it as a pulse. This is most of electronic music, dance-pop, hip-hop. Chinchilla\'s pumping synth bass in "Cut You Off" is static on purpose — the pattern never changes, only the sidechain compression gives it motion.\nActive basslines tell stories. They imply a player who is present and making decisions. They add information. They lift arrangement sections — a fill at the end of every fourth bar signals that something is coming, even before it arrives.\nFor vocal-led pop: static pattern in the verse (let the vocal move), active fills at the end of phrases (signal the chorus), busier in the chorus only if the arrangement thins out to give space.',
        },
        "meta": {
        },
    },
    {
        "id": 'writing-05',
        "type": 'writing',
        "title": '05 — The Bass and the Chorus',
        "oneLiner": 'Choruses need to feel bigger than verses. The bass is one of the most powerful tools for creating that perception of gro',
        "filters": ['writing'],
        "sections": {
            'body': 'Choruses need to feel bigger than verses. The bass is one of the most powerful tools for creating that perception of growth — but it\'s easily overused.\nThe most common approach: the verse bass is sparse and in the sub range (just felt), the chorus bass is more present with more upper harmonic content (heard as well as felt). This is exactly what Eilish does in "Bad Guy" — verse has a clean sub, chorus adds distorted layers panned left and right. The bass got louder and wider, but the actual note pattern is very similar.\nAlternative approach: the chorus bass is simpler and more locked to the kick than the verse. This sounds counterintuitive but it works because the other instruments are adding complexity — the bass\'s job in the chorus is to be the anchor that stops everything flying apart.\nQuestion to ask at each chorus: does the bass need to do more, or does it need to do less and do it harder?\nThe one thing that almost never works: making the bassline more melodically complex in the chorus. The chorus already has a lot happening. A melodically busy bass adds confusion exactly when the listener needs clarity.',
        },
        "meta": {
        },
    },
    {
        "id": 'writing-06',
        "type": 'writing',
        "title": '06 — Space and Silence',
        "oneLiner": "Silence in a bassline is not absence — it's a rhythmic choice. The space between notes is where the groove lives. A bass",
        "filters": ['writing'],
        "sections": {
            'body': "Silence in a bassline is not absence — it's a rhythmic choice. The space between notes is where the groove lives. A bass that plays on every beat creates a different kind of energy than one that syncopates or leaves deliberate gaps.\nThe hardest habit to break in MIDI bassline writing: filling every available space. Real bass players mute strings constantly. Between almost every note there is a brief silence — not audible, but rhythmically present. This is why editing MIDI note lengths to 75–80% of their beat is so important: you're recreating the natural muting behaviour of a physical instrument.\nStrategic silence creates anticipation. If the bass drops out for half a bar before a chorus, the listener's ear reaches forward. When the chorus bass arrives, it feels earned.\nTry this on your current track: remove all bass from the last two beats of each four-bar phrase. Play it back. Does the chorus feel like it arrives harder? It should.",
        },
        "meta": {
        },
    },
]

PROBLEMS = [
    {
        "id": 'problem-vocal-disappears',
        "type": 'problem',
        "title": 'The bass disappears when the vocal comes in',
        "oneLiner": 'The bass disappears when the vocal comes in',
        "filters": ['fix-it'],
        "sections": {
            'cause': "Your bass and vocal are competing in the same frequency range — usually 200–500Hz. When the vocal arrives, it masks the bass in that range and the listener's brain prioritises the voice.",
            'fixSteps': [
                "Check where your vocal sits most of the time using Ableton's spectrum analyser on the vocal track.",
                'On the bass, apply a 2–3dB cut at that frequency using Waves F6 Dynamic EQ — sidechain the cut to the vocal track so it only happens when the vocal is present.',
                'Alternatively: cut 250–350Hz on the bass permanently and rely on the sub and upper harmonics to carry the bass identity.',
                'Check: does the bass still feel present on root notes when the vocal is singing? If not, increase upper harmonic saturation (Waves MaxxBass) so the bass is audible in a different frequency range than the vocal.',
            ],
        },
        "meta": {
            'category': 'Mix position / frequency'
        },
    },
    {
        "id": 'problem-phone-translation',
        "type": 'problem',
        "title": 'Sounds great on monitors, disappears on phone speakers',
        "oneLiner": 'Sounds great on monitors, disappears on phone speakers',
        "filters": ['fix-it'],
        "sections": {
            'cause': "Your bass is mostly sub frequencies (below 80Hz) which phone speakers cannot reproduce. There's no harmonic content above those frequencies for the listener to perceive.",
            'fixSteps': [
                'Add Waves MaxxBass or RBass to the bass channel. Set frequency around 60–80Hz.',
                'Add light saturation (Ableton Saturator, Soft Sine, 15–20% drive) — this also adds harmonics.',
                'Check: play the mix on your laptop speakers. Can you still feel the presence of the bass? If yes, done.',
                'If still weak: the parallel Waves RBass technique — duplicate the bass track, remove all plugins from the duplicate, add only RBass at 60Hz mix 50%.',
            ],
        },
        "meta": {
            'category': 'Translation / harmonics'
        },
    },
    {
        "id": 'problem-kick-fight',
        "type": 'problem',
        "title": 'Bass and kick are fighting — low end sounds cluttered',
        "oneLiner": 'Bass and kick are fighting — low end sounds cluttered',
        "filters": ['fix-it'],
        "sections": {
            'cause': "The kick and bass are both trying to occupy 40–100Hz simultaneously. They're summing and cancelling unpredictably, and neither sounds clear.",
            'fixSteps': [
                'Decision first: who owns the sub? If the kick is sub-heavy (808-style kick), HPF the bass above 80Hz and let the kick own the sub. If the kick is punchy and clicky, let the bass own the sub.',
                'Implement: apply the HPF at the appropriate point using Waves SSL E-Channel or Ableton EQ Eight.',
                'Add sidechain compression: Ableton Compressor on the bass, sidechain from the kick. Ratio 4:1, attack 5ms, release 100ms. 3–5dB GR per hit.',
                'Check in mono — the cluttering is usually worse in mono. If it clears up in mono, you have a phase issue from a stereo bass element. Find and mono it below 150Hz.',
            ],
        },
        "meta": {
            'category': 'Frequency zoning / sidechain'
        },
    },
    {
        "id": 'problem-thin-muddy',
        "type": 'problem',
        "title": 'The bass sounds thin but adding low end makes it muddy',
        "oneLiner": 'The bass sounds thin but adding low end makes it muddy',
        "filters": ['fix-it'],
        "sections": {
            'cause': "The problem isn't too little low end — it's that the low-mid range (200–400Hz) is accumulating and creating perceived muddiness, which makes the bass feel thin by contrast.",
            'fixSteps': [
                'Cut 200–350Hz on the bass with a moderate Q (around 1.5). This feels counterintuitive but often makes the bass feel bigger, not smaller.',
                'Check the kick: if it also has a lot of 200–300Hz content, apply the same cut there.',
                'Now add Waves Renaissance Bass or RBass — this increases perceived low end without adding actual mud.',
                'If still thin: add gentle saturation to generate harmonics in the 100–500Hz range rather than boosting frequencies that are already there.',
            ],
        },
        "meta": {
            'category': 'Frequency conflict / mud'
        },
    },
    {
        "id": 'problem-robotic',
        "type": 'problem',
        "title": 'The bass sounds robotic and mechanical',
        "oneLiner": 'The bass sounds robotic and mechanical',
        "filters": ['fix-it'],
        "sections": {
            'cause': 'Velocity is uniform, note lengths are all the same, timing is perfectly quantised. There is no variation that would indicate a human was present.',
            'fixSteps': [
                'Velocity first: select all notes in the piano roll. Manually adjust — emphasis notes to 95–105, passing notes to 65–75. Never leave two consecutive notes at identical velocity.',
                'Note lengths: select all notes, drag ends to approximately 80% of their beat value. Leave gaps between notes.',
                'Timing: in Ableton, drag the Groove Pool "MPC 16 Swing 67%" groove onto your bass MIDI clip. Set Timing at 40–50%.',
                'Go through bar by bar and offset individual notes by 5–15ms manually in the piano roll. The irregularity is the humanity.',
            ],
        },
        "meta": {
            'category': 'MIDI / humanisation'
        },
    },
    {
        "id": 'problem-pump-hard',
        "type": 'problem',
        "title": 'The bass pumps too hard / sidechain is too obvious',
        "oneLiner": 'The bass pumps too hard / sidechain is too obvious',
        "filters": ['fix-it'],
        "sections": {
            'cause': 'The sidechain compressor release time is too short, or the ratio and threshold are set too aggressively. The duck is deeper and faster than feels musical.',
            'fixSteps': [
                'Increase the release time on the sidechain compressor — at 130BPM a 1/16th note is ~115ms. If your release is shorter than 80ms, increase it.',
                'Reduce the ratio from 8:1 to 4:1 and retrim the threshold to maintain similar GR.',
                'If pumping is still too obvious: use Waves F6 Dynamic EQ instead of a compressor. Set a dynamic cut at 60–100Hz sidechained to the kick. Only the sub ducks — much more transparent.',
                'Check: does the pumping feel intentional (dance-pop, electronic) or like an accident (ballad, R&B)? If the latter, consider removing sidechain entirely and using EQ frequency zoning instead.',
            ],
        },
        "meta": {
            'category': 'Sidechain / dynamics'
        },
    },
    {
        "id": 'problem-lifeless',
        "type": 'problem',
        "title": 'The bass feels lifeless even with good processing',
        "oneLiner": 'The bass feels lifeless even with good processing',
        "filters": ['fix-it'],
        "sections": {
            'cause': "This is usually a writing problem, not a processing problem. The bassline pattern doesn't have rhythmic or melodic interest, or it doesn't interact with anything else in the arrangement.",
            'fixSteps': [
                'Look at the MIDI pattern: does it do the same thing every bar with no variation? Add a fill every 4 bars — a single extra note or rhythm change signals that a musician is present.',
                "Check the velocity lane: if it's flat, see the robotic bass fix above.",
                'Look at where the bass notes fall relative to the kick drum: if always perfectly aligned, offset the bass notes by half a subdivision occasionally to create rhythmic interplay.',
                'Consider the note choices: is the bass only playing root notes? Add one passing tone per phrase — the note between two chord roots.',
            ],
        },
        "meta": {
            'category': 'Writing / arrangement'
        },
    },
    {
        "id": 'problem-solo-mix',
        "type": 'problem',
        "title": 'Bass sounds fine in solo but wrong in the mix',
        "oneLiner": 'Bass sounds fine in solo but wrong in the mix',
        "filters": ['fix-it'],
        "sections": {
            'cause': "You've been optimising for how it sounds alone, not how it interacts with the other elements. The bass is likely occupying frequency space that other instruments need.",
            'fixSteps': [
                'Always A/B with the full mix playing. Never solo the bass for more than 10 seconds at a time.',
                'Import a commercial reference track with a similar bass role. Match levels by ear (not RMS — perceived loudness). Switch between your mix and the reference at the same playback point.',
                "Identify what the reference bass has in context that yours doesn't: more present? More recessed? More mid-range? More sub?",
                'Make changes with the full mix playing, not in solo mode. Your ears will tell you the right answer if you listen in the right context.',
            ],
        },
        "meta": {
            'category': 'Mix context / frequency'
        },
    },
]

REFERENCE = [
    {
        "id": 'reference-01',
        "type": 'reference',
        "title": 'Step 1 — Match the level before you listen',
        "oneLiner": 'Import the reference track into Ableton on a separate track.',
        "filters": ['reference'],
        "sections": {
            'body': "Import the reference track into Ableton on a separate track. Match its loudness to your mix by ear — not by meter. They should feel equally loud when you A/B them. If the reference is louder, your brain will perceive it as better regardless of what you're actually comparing. Play 8 bars of your mix, then 8 bars of the reference. Adjust the reference volume until you genuinely can't tell which is louder. Now you're ready to listen.",
        },
        "meta": {
        },
    },
    {
        "id": 'reference-02',
        "type": 'reference',
        "title": 'Step 2 — Listen to the whole first',
        "oneLiner": 'Before you try to analyse anything, listen to the reference all the way through as music.',
        "filters": ['reference'],
        "sections": {
            'body': "Before you try to analyse anything, listen to the reference all the way through as music. Not as a production exercise. Let it affect you. Notice how it makes you feel, when the bass appears to your consciousness, when you stop noticing it. The moments when you stop noticing the bass are the most instructive. That's when it's doing its job perfectly — when it's so appropriate to the song that it becomes invisible. Second listen: pay attention only to the bass. What rhythm is it playing? Does it move melodically or stay on roots? How prominent is it relative to the vocal?",
        },
        "meta": {
        },
    },
    {
        "id": 'reference-03',
        "type": 'reference',
        "title": 'Step 3 — Identify the style and techniques',
        "oneLiner": 'Is it a synth or a real instrument? Real basses have attack irregularity, string noise, and slight timing imprecision.',
        "filters": ['reference'],
        "sections": {
            'body': "Is it a synth or a real instrument? Real basses have attack irregularity, string noise, and slight timing imprecision. Synths are perfectly even. If you're not sure — it's probably a synth. Where does the sub live? Check on laptop speakers. If the bass largely disappears — it's a sub-heavy sound (808 or pure sine). If it stays present — it has upper harmonic content. Does it pump? Is there a rhythmic breathing quality that matches the kick? If yes — sidechain compression is present. What does it do rhythmically? Count the notes per bar. Are they on the beat or syncopated? Does the pattern change between verse and chorus?",
        },
        "meta": {
        },
    },
    {
        "id": 'reference-04',
        "type": 'reference',
        "title": "Step 4 — Use Ableton's tools to see what you hear",
        "oneLiner": "Ableton's spectrum analyser (on the reference track) will show you the frequency distribution of the bass in the context of the full mix.",
        "filters": ['reference'],
        "sections": {
            'body': "Ableton's spectrum analyser (on the reference track) will show you the frequency distribution of the bass in the context of the full mix. Look for where the energy peaks. Useful check: play the reference, then high-pass filter it at 200Hz temporarily on the master. Hear what's left. That's roughly what the bass sounds like on phone speakers — whether audible or mostly gone tells you how much upper harmonic content it has. Low-pass the reference at 200Hz instead. That's the sub layer in isolation. Does it feel substantial or thin?",
        },
        "meta": {
        },
    },
    {
        "id": 'reference-05',
        "type": 'reference',
        "title": "Step 5 — Identify what's different from your bass",
        "oneLiner": 'Now A/B your mix and the reference specifically on the bass.',
        "filters": ['reference'],
        "sections": {
            'body': "Now A/B your mix and the reference specifically on the bass. Ask: Is the reference bass more present or more recessed than yours? Is it warmer or brighter? Does it pump more or less? Does it have more or less harmonic content on small speakers? Does the pattern feel more or less alive? Write down one specific thing that's different. Just one. Fix that before you listen again. Trying to fix everything at once means you fix nothing — you can't isolate what changed.",
        },
        "meta": {
        },
    },
    {
        "id": 'reference-06',
        "type": 'reference',
        "title": 'Step 6 — Trust the A/B more than your solo ear',
        "oneLiner": 'Your ears adapt.',
        "filters": ['reference'],
        "sections": {
            'body': "Your ears adapt. After 20 minutes in a mix, you can no longer reliably judge what's happening in the low end. The A/B with the reference resets your calibration every time you use it. The practical discipline: every 30 minutes, stop mixing and A/B 16 bars of your mix against 16 bars of the reference at matched levels. Note one thing that's different. Fix it. Return to mixing. This is how professional mixing engineers actually use reference tracks — not as a target to copy, but as a reset that keeps them from drifting.",
        },
        "meta": {
        },
    },
]

VOCAL = [
    {
        "id": 'vocal-low',
        "type": 'vocal',
        "title": 'Low Vocal Register',
        "oneLiner": 'If you sing in chest voice below G3, your voice and the upper bass occupy the same frequencies.',
        "filters": ['vocal'],
        "sections": {
            'body': "If you sing in chest voice below G3, your voice and the upper bass occupy the same frequencies. A present, mid-rich bass will compete directly and mask the vocal. Solution: push the bass into the sub (below 100Hz), cut 200–400Hz on the bass, and rely on sub weight and upper harmonic saturation for translation. Your voice owns the mid-range. This is why Eilish's bass is almost always in the sub range during verses — her voice sits low and the bass has to move.",
        },
        "meta": {
        },
    },
    {
        "id": 'vocal-high',
        "type": 'vocal',
        "title": 'High Vocal Register',
        "oneLiner": 'If you primarily sing above C4, your voice lives above the upper bass range.',
        "filters": ['vocal'],
        "sections": {
            'body': 'If you primarily sing above C4, your voice lives above the upper bass range. You have more freedom for the bass to have mid-range character without conflict. A warm analog-style bass with body in 150–300Hz will complement rather than compete. Be aware of the 500Hz–1kHz range where bright female vocals and bass character can still clash.',
        },
        "meta": {
        },
    },
    {
        "id": 'vocal-sparse',
        "type": 'vocal',
        "title": 'Sparse Vocal',
        "oneLiner": 'When your vocal has rests, held notes, and breath — the bass can be more active and melodic in those spaces.',
        "filters": ['vocal'],
        "sections": {
            'body': "When your vocal has rests, held notes, and breath — the bass can be more active and melodic in those spaces. A static repeating bass under a sparse vocal can feel underwhelming. Use the vocal's silences as permission for the bass to move. A fill where you take a breath, a melodic phrase where you hold a note.",
        },
        "meta": {
        },
    },
    {
        "id": 'vocal-dense',
        "type": 'vocal',
        "title": 'Dense Vocal',
        "oneLiner": 'Busy vocal delivery needs a simple bass.',
        "filters": ['vocal'],
        "sections": {
            'body': 'Busy vocal delivery needs a simple bass. Every syllable is a rhythmic event competing for rhythmic space. A busy bassline creates rhythmic clutter that makes both the vocal and the bass harder to follow. Root notes, simple patterns, let the vocal carry the rhythm and the bass carry the harmony.',
        },
        "meta": {
        },
    },
    {
        "id": 'vocal-intimate',
        "type": 'vocal',
        "title": 'Emotional / Intimate Delivery',
        "oneLiner": 'When a vocal performance is emotionally raw and close — the bass should feel the same way.',
        "filters": ['vocal'],
        "sections": {
            'body': "When a vocal performance is emotionally raw and close — the bass should feel the same way. Warm, slightly imperfect, organic. A perfectly quantised electronic bass under an intimate vocal creates an emotional mismatch. Add groove swing, velocity variation, slight timing imprecision. The bass should sound like it's listening to you.",
        },
        "meta": {
        },
    },
    {
        "id": 'vocal-belt',
        "type": 'vocal',
        "title": 'Powerful / Belt Vocal',
        "oneLiner": 'A strong belt vocal has a lot of energy in the 400Hz–2kHz range.',
        "filters": ['vocal'],
        "sections": {
            'body': 'A strong belt vocal has a lot of energy in the 400Hz–2kHz range. The bass needs to be out of that zone entirely — either in the sub, or in the upper harmonics above 2kHz. A mid-rich bass under a belt vocal creates a congested mix. In choruses with powerful vocals, often the correct bass move is simpler and lower, not more.',
        },
        "meta": {
        },
    },
    {
        "id": 'vocal-low-mids',
        "type": 'vocal',
        "title": 'Vocal in the Low-Mids (300–600Hz)',
        "oneLiner": 'Many pop vocals have their character in the low-mids — warmth, body, presence.',
        "filters": ['vocal'],
        "sections": {
            'body': "Many pop vocals have their character in the low-mids — warmth, body, presence. If you boost 300–500Hz on your vocal (as many do), you need to cut the same range on the bass. They can't both live there. Use a complementary EQ approach: if the vocal gets warmth, the bass gets clarity, and vice versa. They share the frequency range rather than both claiming it.",
        },
        "meta": {
        },
    },
    {
        "id": 'vocal-reverb',
        "type": 'vocal',
        "title": 'Reverb-Heavy Vocal',
        "oneLiner": 'A vocal with long reverb tails fills the frequency spectrum in the low-mids during the decay.',
        "filters": ['vocal'],
        "sections": {
            'body': "A vocal with long reverb tails fills the frequency spectrum in the low-mids during the decay. This can make the bass disappear — the reverb tail is sitting in the same space. Either high-pass the reverb return at 200Hz (so the tail doesn't accumulate in the bass range), or make the bass more sub-focused so it lives below the reverb energy.",
        },
        "meta": {
        },
    },
]

ALL_CONTENT = (
    STYLES
    + TECHNIQUES
    + CHARACTER
    + WRITING
    + PROBLEMS
    + REFERENCE
    + VOCAL
)

CONTENT_COUNTS = {
    "styles": 9,
    "techniques": 20,
    "character": 32,
    "writing": 6,
    "problems": 8,
    "reference": 6,
    "vocal": 8,
}

