import os
import numpy as np
import soundfile as sf
from typing import Dict, Any, List

def synthesize_vocal_phrase(
    duration: float,
    f0_start: float = 130.0,
    f0_end: float = 120.0,
    formants: List[float] = [700, 1200, 2600],
    sr: int = 16000,
    is_pause: bool = False,
    volume: float = 0.5
) -> np.ndarray:
    """
    Synthesizes a realistic vocal segment using glottal pulse train,
    formant resonance filters, and subtle breath noise.
    """
    num_samples = int(duration * sr)
    if num_samples <= 0:
        return np.zeros(0, dtype=np.float32)

    if is_pause:
        # Subtle ambient room noise
        return np.random.normal(0, 0.003, num_samples).astype(np.float32)

    t = np.linspace(0, duration, num_samples, endpoint=False)

    # Dynamic F0 contour with natural micro-vibrato
    vibrato = 2.0 * np.sin(2 * np.pi * 5.2 * t)
    f0_t = np.linspace(f0_start, f0_end, num_samples) + vibrato
    phase = 2 * np.pi * np.cumsum(f0_t) / sr

    # Rich harmonic glottal source
    glottal = (
        1.0 * np.sin(phase) +
        0.55 * np.sin(2 * phase) +
        0.35 * np.sin(3 * phase) +
        0.20 * np.sin(4 * phase) +
        0.12 * np.sin(5 * phase) +
        0.08 * np.sin(6 * phase)
    )

    # Apply formant amplification
    signal = glottal.copy()
    for f in formants:
        # Resonator simulation
        signal += 0.25 * np.sin(2 * np.pi * f * t) * np.exp(-0.001 * t)

    # Add gentle breath aspiration
    breath = np.random.normal(0, 0.02, num_samples)
    signal = signal * 0.9 + breath

    # Smooth windowing envelope (attack and release)
    attack_samples = min(int(0.04 * sr), num_samples // 4)
    release_samples = min(int(0.05 * sr), num_samples // 4)
    envelope = np.ones(num_samples)

    if attack_samples > 0:
        envelope[:attack_samples] = np.linspace(0, 1, attack_samples)
    if release_samples > 0:
        envelope[-release_samples:] = np.linspace(1, 0, release_samples)

    signal = signal * envelope * volume
    return signal.astype(np.float32)

def generate_speech_audio(phrases_spec: List[Dict[str, Any]], sr: int = 16000) -> np.ndarray:
    """Concatenates phrases and pauses into a complete continuous speech audio clip."""
    audio_chunks = []
    for spec in phrases_spec:
        dur = spec.get("duration", 1.0)
        is_p = spec.get("is_pause", False)
        f0_s = spec.get("f0_start", 130.0)
        f0_e = spec.get("f0_end", 125.0)
        vol = spec.get("volume", 0.6)
        formants = spec.get("formants", [700, 1200, 2600])

        chunk = synthesize_vocal_phrase(
            duration=dur,
            f0_start=f0_s,
            f0_end=f0_e,
            formants=formants,
            sr=sr,
            is_pause=is_p,
            volume=vol
        )
        audio_chunks.append(chunk)

    if not audio_chunks:
        return np.zeros(sr, dtype=np.float32)

    return np.concatenate(audio_chunks)

def create_sample_preset_data(output_dir: str) -> Dict[str, Any]:
    """
    Creates reference and participant audio files for demo speech scripts:
    1. 'To be, or not to be' (Interpretive Reading)
    2. 'The Great Challenge of Our Time' (Persuasive Oratory)
    """
    os.makedirs(output_dir, exist_ok=True)
    sr = 16000

    # Script 1: Shakespeare's Hamlet
    script_1_text = (
        "To be, or not to be, that is the question: "
        "Whether 'tis nobler in the mind to suffer "
        "The slings and arrows of outrageous fortune, "
        "Or to take arms against a sea of troubles."
    )

    # Reference Audio: Balanced pacing (approx 135 WPM), natural pauses, dynamic pitch
    ref_1_spec = [
        {"duration": 1.4, "f0_start": 140, "f0_end": 130, "volume": 0.65},  # To be,
        {"duration": 0.5, "is_pause": True},                                # pause
        {"duration": 1.5, "f0_start": 145, "f0_end": 132, "volume": 0.65},  # or not to be,
        {"duration": 0.6, "is_pause": True},                                # pause
        {"duration": 1.7, "f0_start": 150, "f0_end": 118, "volume": 0.70},  # that is the question:
        {"duration": 0.7, "is_pause": True},                                # pause
        {"duration": 2.2, "f0_start": 135, "f0_end": 128, "volume": 0.65},  # Whether 'tis nobler in the mind to suffer
        {"duration": 0.6, "is_pause": True},                                # pause
        {"duration": 2.5, "f0_start": 142, "f0_end": 122, "volume": 0.68},  # The slings and arrows of outrageous fortune,
        {"duration": 0.7, "is_pause": True},                                # pause
        {"duration": 2.4, "f0_start": 138, "f0_end": 115, "volume": 0.65},  # Or to take arms against a sea of troubles.
    ]

    ref_1_audio = generate_speech_audio(ref_1_spec, sr)
    ref_1_path = os.path.join(output_dir, "hamlet_reference.wav")
    sf.write(ref_1_path, ref_1_audio, sr, subtype="PCM_16")

    # Participant Audio: Includes known flaws:
    # 1. Rushed first phrase (0.8s instead of 1.4s -> excessive speaking rate)
    # 2. Prolonged awkward pause (1.9s at 4.2s -> excessive pause)
    # 3. Monotone pitch on line 2 (F0 flat at 122Hz -> flat intonation)
    # 4. Loudness drops by 75% on final phrase (trailing off)
    part_1_spec = [
        {"duration": 0.75, "f0_start": 155, "f0_end": 150, "volume": 0.65}, # RUSHED: To be, or not to be
        {"duration": 0.3, "is_pause": True},
        {"duration": 1.4, "f0_start": 145, "f0_end": 138, "volume": 0.65},  # that is the question:
        {"duration": 1.9, "is_pause": True},                                 # AWKWARD LONG PAUSE (1.9s)
        {"duration": 2.3, "f0_start": 122, "f0_end": 122, "volume": 0.65},  # MONOTONE: Whether 'tis nobler in the mind to suffer
        {"duration": 0.5, "is_pause": True},
        {"duration": 2.4, "f0_start": 128, "f0_end": 120, "volume": 0.60},  # The slings and arrows of outrageous fortune,
        {"duration": 0.5, "is_pause": True},
        {"duration": 2.2, "f0_start": 120, "f0_end": 110, "volume": 0.15},  # TRAILING OFF: Or to take arms against a sea of troubles.
    ]

    part_1_audio = generate_speech_audio(part_1_spec, sr)
    part_1_path = os.path.join(output_dir, "hamlet_participant_flawed.wav")
    sf.write(part_1_path, part_1_audio, sr, subtype="PCM_16")

    # Script 2: Persuasive Oratory
    script_2_text = (
        "We stand today at a profound technological crossroads. "
        "The algorithms we build will shape human democracy, "
        "and our responsibility demands unwavering courage."
    )

    ref_2_spec = [
        {"duration": 2.6, "f0_start": 145, "f0_end": 128, "volume": 0.70},
        {"duration": 0.65, "is_pause": True},
        {"duration": 2.8, "f0_start": 148, "f0_end": 125, "volume": 0.68},
        {"duration": 0.7, "is_pause": True},
        {"duration": 2.7, "f0_start": 142, "f0_end": 118, "volume": 0.72},
    ]
    ref_2_audio = generate_speech_audio(ref_2_spec, sr)
    ref_2_path = os.path.join(output_dir, "oratory_reference.wav")
    sf.write(ref_2_path, ref_2_audio, sr, subtype="PCM_16")

    part_2_spec = [
        {"duration": 1.6, "f0_start": 160, "f0_end": 155, "volume": 0.65}, # Fast tempo
        {"duration": 0.25, "is_pause": True},
        {"duration": 2.9, "f0_start": 125, "f0_end": 124, "volume": 0.65}, # Flat intonation
        {"duration": 1.8, "is_pause": True},                                # Excessive pause
        {"duration": 2.6, "f0_start": 130, "f0_end": 115, "volume": 0.18}, # Attenuated tail
    ]
    part_2_audio = generate_speech_audio(part_2_spec, sr)
    part_2_path = os.path.join(output_dir, "oratory_participant_flawed.wav")
    sf.write(part_2_path, part_2_audio, sr, subtype="PCM_16")

    return {
        "script_1": {
            "title": "Shakespeare's Hamlet - Soliloquy",
            "category": "Interpretive Reading",
            "transcript": script_1_text,
            "reference_audio": ref_1_path,
            "participant_audio": part_1_path
        },
        "script_2": {
            "title": "The Great Technological Crossroads",
            "category": "Persuasive Oratory",
            "transcript": script_2_text,
            "reference_audio": ref_2_path,
            "participant_audio": part_2_path
        }
    }

if __name__ == "__main__":
    presets = create_sample_preset_data("data/samples")
    print(f"Synthesized preset audio successfully in data/samples: {list(presets.keys())}")
