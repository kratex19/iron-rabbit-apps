// Small React hook wrapping the browser SpeechRecognition API (no external service).
// Returns start/stop/reset controls, the current transcript and a `supported`
// flag so callers can hide the mic button on unsupported browsers.
import { useEffect, useRef, useState, useCallback } from "react";

const SpeechRecognition =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export const speechSupported = !!SpeechRecognition;

export default function useVoiceInput({ lang = "en-US", interim = true } = {}) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  const stop = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    setListening(false);
  }, []);

  const reset = useCallback(() => setTranscript(""), []);

  const start = useCallback(() => {
    if (!SpeechRecognition) { setError("Not supported on this browser"); return; }
    setError(null);
    const rec = new SpeechRecognition();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = interim;
    rec.onresult = (event) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setTranscript(prev => (prev ? prev + " " : "") + text.trim());
    };
    rec.onerror = (e) => { setError(e.error || "recognition error"); setListening(false); };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    try { rec.start(); setListening(true); }
    catch (e) { setError(String(e)); }
  }, [lang, interim]);

  useEffect(() => () => { try { recognitionRef.current?.abort(); } catch { /* ignore */ } }, []);

  return { supported: speechSupported, listening, transcript, error, start, stop, reset };
}
