# Games 4 MC Companion

## What is this project?

This project forks [Mindcraft](https://github.com/mindcraft-bots/mindcraft), an embedded agentic framework designed for LLM interaction in Minecraft. Our work introduces "Janet," an agent enhanced with a planner and task-management capabilities. We evaluate Janet's performance relative to the baseline agent, "Andy," to investigate the efficacy of structured planning in agentic frameworks.

## Change Model to gpt-4o-mini

1) Open:janet.js
- Find the model configuration and change it to: "model": "gpt-4o-mini"
- Locate the embedding configuration. It should be set to: "embedding": "openai"

2) Add Your OpenAI API Key, go to the file: keys.example.json

Create a new file : keys.json
Paste the copied content inside
Replace: "openaiApiKey": "YOUR_API_KEY_HERE"
e.g. "openaiApiKey": "sk-xxxxxxxxxxxxxxxx"


3) remember to Ctrl+s before node main.js
4) Important
    - After creating keys.json, delete or remove keysExample.json
    - Never commit keys.json to Git
    - Make sure keys.json is in .gitignore



## Installation

Kokoro-TTS:
1) Download the kokoro-onnx file and bin file
```
https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files/kokoro-v0_19.fp16.onnx
https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
```
2) Place both files in ./src/agent/kokoro

3) Ensure that ffplay is installed
```
https://ffmpeg.org/download.html
```

Mindcraft files:  
1) run "npm install" in the root directory

Local LLM (If you are not using LLM API):
1) Install ollama
2) Run the following command to install the mindcraft LLM model:
```
ollama pull sweaterdog/andy-4:micro-q8_0 && ollama pull embeddinggemma
```

## Running
1) Launch ollama (If you are running the model locally)
2) Open Minecraft Launcher and launch Version 1.21.1
3) Go to single player and open a single player world
4) Once you are in the world, press "esc" and select "open to LAN" (Allow command usage to enable voice transcript)
5) Enter port number 55916
6) In the root directory run `node main.js`
7) If there are no errors in the terminal Janet should join your game
