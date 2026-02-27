# ASR Voice Input for Mindcraft

Push-to-talk voice input for the Minecraft dialogue agent. Hold **V** in-game to speak — your speech is transcribed and sent to the agent automatically.

## Architecture

```
Player holds V → mic recording → ASR Server (faster-whisper) → text → MindServer → Agent
```

## Files

```
asr/
├── launcher.js            # Auto-starts ASR server + Voice Bridge from main.js
├── asr_server/
│   ├── asr_server.py      # FastAPI server, /asr endpoint (speech → text)
│   └── requirements.txt
└── voice_bridge/
    ├── voice_bridge.py    # Keyboard listener + mic recording + socket.io sender
    └── requirements.txt
```

**Dependencies outside this folder:**
- `main.js` — imports and calls `asr/launcher.js` when `asr_enabled` is true
- `settings.js` — contains ASR configuration (see below)

## Configuration

In `settings.js`:

```javascript
"asr_enabled": true,      // false to disable voice input
"asr_port": 8090,         // ASR server port
"asr_player": "ADMIN",    // player name the agent sees
"asr_key": "v",           // push-to-talk key
```

The agent name is read automatically from the profile JSON in `settings.profiles`.

## Prerequisites

- Python 3.10+ (in PATH)
- `libportaudio2` and `ffmpeg` on Linux (`sudo apt install -y libportaudio2 portaudio19-dev ffmpeg`)
- On Windows: install Python with "Add to PATH", install [ffmpeg](https://www.gyan.dev/ffmpeg/builds/) and add to PATH

## Usage

```bash
node main.js
```

Python environments and dependencies are created automatically on first run. Hold **V** to speak, release to send. If V conflicts with a Minecraft keybind, change `asr_key` in `settings.js`.

To run components manually (for debugging), set `"asr_enabled": false` and start each in a separate terminal:

```bash
# Terminal 1: ASR Server
cd asr/asr_server && source .venv/bin/activate
python -m uvicorn asr_server:app --host 127.0.0.1 --port 8090

# Terminal 2: Mindcraft
node main.js

# Terminal 3: Voice Bridge
cd asr/voice_bridge && source .venv/bin/activate
python voice_bridge.py --agent Janet --player Steve
```