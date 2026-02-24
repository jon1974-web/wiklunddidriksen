# AFFE UI and voice

## Simple web UI

The UI gives you:

- **Text**: Type in the box and press Enter or click Send.
- **Voice**: Click the mic button, then speak. Your Mac’s built-in microphone is used (via the browser). The app uses the browser’s speech-to-text and sends the result to AFFE.

### Run the UI

1. Activate the venv and install (if you haven’t):
   ```bash
   cd /path/to/affe
   source .venv/bin/activate
   pip install -e .
   ```

2. Start the UI server:
   ```bash
   affe-ui
   ```
   Or: `python3 -m affe.ui`

3. Open in your browser: **http://127.0.0.1:5050**

4. Use the text box or click the mic, speak (e.g. “What meetings do I have tomorrow?”), and see AFFE’s reply.

To use another port: `AFFE_UI_PORT=8080 affe-ui`

---

## “Hey AFFE” wake phrase

**Can we use “Hey AFFE” to open the UI or start listening?**

- **macOS does not offer** a public API for custom wake words like “Hey Siri”. Third-party apps cannot register a system-wide “Hey AFFE” the same way Siri works.

- **What we have now**: **Push-to-talk** – click the mic button (or press a shortcut if we add one), then speak. The browser asks for microphone access once; after that, the Mac mic is used for that session.

- **Possible later**: A **background listener** that always listens and, when it hears “hey affe” (via speech recognition), focuses or opens the UI. That would require:
  - The app (or a helper process) running in the background.
  - Continuous speech-to-text (e.g. local Whisper or a cloud API), which uses more battery and CPU.
  - Handling privacy (e.g. “AFFE is listening” indicator, option to turn it off).

So for now we use **push-to-talk**; a “Hey AFFE” style wake word could be added later as an optional, always-on feature.
