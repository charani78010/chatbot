# InterviewMate AI

A local-first HR interview practice app for a first-time software-job applicant. It uses plain HTML, CSS, and JavaScript; there are no package installs, API keys, or external AI services. Chat messages are sent directly from your browser to Ollama on your computer. Practice counts and chat history are stored in this browser's local storage.

## Run on Windows

1. Install and start [Ollama](https://ollama.com/download/windows), then download the models:

   ```powershell
   ollama pull qwen2.5:3b
   ollama pull llama3.2
   ```

2. Open PowerShell in this project folder and start a local web server:

   ```powershell
   py -m http.server 8000
   ```

   If `py` is not available, try `python -m http.server 8000`. If Python is not installed, open this folder in VS Code and use the **Live Server** extension; serve `index.html` at `http://127.0.0.1:5500`.

3. Open [http://localhost:8000](http://localhost:8000) in your browser.

4. If the connection indicator says Ollama is unavailable, allow this local site through Ollama's browser-origin check. If Ollama is already running as a background service, quit it completely (including its tray icon). Open a **second** PowerShell window and start Ollama with the local site origin allowed:

   ```powershell
   $env:OLLAMA_ORIGINS="http://localhost:8000"
   ollama serve
   ```

   For VS Code Live Server, use `$env:OLLAMA_ORIGINS="http://127.0.0.1:5500"` instead. Keep the Ollama PowerShell window open. If Ollama is already running as a background service, quit that service first so the new process picks up the setting. `localhost` and `127.0.0.1` are different browser origins; use the matching address consistently.

   For a quick local-only test, Ollama also accepts `OLLAMA_ORIGINS=*`. This is broader than necessary; prefer the specific local origin above, and do not expose Ollama's port to the internet.

## Use the app

- Pick **Qwen 2.5 · 3B** or **Llama 3.2** from the model selector.
- Choose a suggested question or select a topic card. The coach explains the question, gives a fresher-friendly sample answer, and invites you to practise.
- Select **Mock interview**, choose a difficulty and 5, 7, or 10 questions, then start. The coach asks one question at a time. Submit your answer to receive feedback; continue when you are ready. A summary is generated at the end.
- Your question count, explored topics, completed mock interviews, recent practice prompts, and chat history are kept in your browser. **Clear conversation** leaves the progress dashboard intact. **Reset progress** clears only dashboard data.

## Troubleshooting

- Check that the selected model is installed with `ollama list`.
- Check the Ollama service at `http://localhost:11434` and verify that port `11434` is not blocked.
- If the browser reports a CORS/network error, restart Ollama with `OLLAMA_ORIGINS` set as described above. Do not open this app as a `file:///` URL; serve it over `http://localhost:8000`.
- Model responses can differ. Try the other model or send a shorter prompt if a response times out.
- No chat content is sent to a remote application service. The Google Fonts stylesheet is an optional visual enhancement; system-font fallbacks are provided.
