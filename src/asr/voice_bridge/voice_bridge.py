#!/usr/bin/env python3
"""
voice_bridge.py - Push-to-talk voice input for Mindcraft

Hold V to record -> ASR server transcribes -> text sent to Mindcraft agent via socket.io

Usage:
  python voice_bridge.py
  python voice_bridge.py --agent andy --player Steve
  python voice_bridge.py --key g  # use G key instead of V
"""

import argparse
import io
import sys
import time
import threading
import numpy as np
import soundfile as sf
import requests
import socketio

# Recording state
recording = False
audio_chunks = []
sample_rate = 16000
rec_stream = None
rec_start_time = 0


def on_audio_data(indata, frames, time_info, status):
    """sounddevice callback: collect audio data."""
    if recording:
        audio_chunks.append(indata.copy())


def start_recording():
    """Start microphone recording."""
    global recording, audio_chunks, rec_stream, rec_start_time
    import sounddevice as sd

    if recording:
        return

    audio_chunks = []
    recording = True
    rec_start_time = time.time()

    rec_stream = sd.InputStream(
        samplerate=sample_rate,
        channels=1,
        dtype='float32',
        callback=on_audio_data,
        blocksize=1024
    )
    rec_stream.start()
    print("[REC] Recording... (release V to stop)")


def stop_recording_and_send(asr_url, sio, agent_name, player_name):
    """Stop recording, send to ASR, forward result to MindServer."""
    global recording, rec_stream

    if not recording:
        return

    recording = False
    held_ms = (time.time() - rec_start_time) * 1000

    if rec_stream:
        rec_stream.stop()
        rec_stream.close()
        rec_stream = None

    # Check minimum duration
    if held_ms < 300:
        print("[WARN] Too short, hold V longer")
        return

    if not audio_chunks:
        print("[WARN] No audio captured")
        return

    # Merge audio chunks
    audio = np.concatenate(audio_chunks, axis=0).flatten()
    duration = len(audio) / sample_rate
    print(f"[ASR] Processing... ({duration:.1f}s audio)")

    # Convert to WAV bytes
    buf = io.BytesIO()
    sf.write(buf, audio, sample_rate, format='WAV', subtype='PCM_16')
    wav_bytes = buf.getvalue()

    # Send to ASR server
    try:
        resp = requests.post(
            asr_url,
            data=wav_bytes,
            headers={'Content-Type': 'audio/wav'},
            timeout=30
        )
        resp.raise_for_status()
        text = resp.text.strip()
    except Exception as e:
        print(f"[ERROR] ASR request failed: {e}")
        return

    if not text:
        print("[WARN] No speech detected")
        return

    print(f"[YOU] {text}")

    # Send to MindServer via socket.io
    try:
        sio.emit('send-message', (agent_name, {
            'from': player_name,
            'message': text
        }))
        print(f"[SENT] Message forwarded to agent '{agent_name}'")
    except Exception as e:
        print(f"[ERROR] MindServer send failed: {e}")


def main():
    parser = argparse.ArgumentParser(description='Voice Bridge: push-to-talk voice input for Mindcraft')
    parser.add_argument('--agent', default='andy', help='Agent name (default: andy)')
    parser.add_argument('--player', default='ADMIN', help='Player name shown in chat (default: ADMIN)')
    parser.add_argument('--asr-url', default='http://127.0.0.1:8090/asr', help='ASR server URL')
    parser.add_argument('--mindserver-url', default='http://localhost:8080', help='MindServer URL')
    parser.add_argument('--key', default='v', help='Push-to-talk key (default: v)')
    args = parser.parse_args()

    # Check dependencies
    try:
        import sounddevice as sd
        from pynput import keyboard
    except ImportError as e:
        print(f"[ERROR] Missing dependency: {e}")
        print("Install with: pip install sounddevice pynput numpy soundfile requests python-socketio[client]")
        sys.exit(1)

    # Check ASR server
    print(f"[INIT] Checking ASR Server ({args.asr_url})...")
    try:
        test_audio = np.zeros(1600, dtype=np.float32)
        test_buf = io.BytesIO()
        sf.write(test_buf, test_audio, sample_rate, format='WAV', subtype='PCM_16')
        resp = requests.post(args.asr_url, data=test_buf.getvalue(),
                             headers={'Content-Type': 'audio/wav'}, timeout=5)
        resp.raise_for_status()
        print(f"  ASR Server OK")
    except Exception as e:
        print(f"  ASR Server failed: {e}")
        sys.exit(1)

    # Connect to MindServer
    print(f"[INIT] Connecting to MindServer ({args.mindserver_url})...")
    sio = socketio.Client()

    @sio.event
    def connect():
        print(f"  MindServer connected")

    @sio.event
    def disconnect():
        print(f"  MindServer disconnected")

    @sio.on('agents-status')
    def on_agents_status(agents):
        names = [a['name'] for a in agents if a.get('in_game')]
        if names:
            print(f"  Online agents: {', '.join(names)}")

    try:
        sio.connect(args.mindserver_url)
    except Exception as e:
        print(f"  MindServer connection failed: {e}")
        sys.exit(1)

    # Keyboard listener
    print(f"\n{'=' * 50}")
    print(f"  Voice Bridge started!")
    print(f"  Hold [{args.key.upper()}] to speak, release to send")
    print(f"  Agent: {args.agent}")
    print(f"  Player: {args.player}")
    print(f"  Press Ctrl+C to quit")
    print(f"{'=' * 50}\n")

    target_key = args.key.lower()
    v_pressed = False

    def on_press(key):
        nonlocal v_pressed
        try:
            if hasattr(key, 'char') and key.char == target_key:
                if not v_pressed:
                    v_pressed = True
                    start_recording()
        except AttributeError:
            pass

    def on_release(key):
        nonlocal v_pressed
        try:
            if hasattr(key, 'char') and key.char == target_key:
                if v_pressed:
                    v_pressed = False
                    threading.Thread(
                        target=stop_recording_and_send,
                        args=(args.asr_url, sio, args.agent, args.player),
                        daemon=True
                    ).start()
        except AttributeError:
            pass

    listener = keyboard.Listener(on_press=on_press, on_release=on_release)
    listener.start()

    try:
        while True:
            time.sleep(0.1)
    except KeyboardInterrupt:
        print("\n\nStopping Voice Bridge...")
        listener.stop()
        sio.disconnect()
        print("Bye!")


if __name__ == '__main__':
    main()