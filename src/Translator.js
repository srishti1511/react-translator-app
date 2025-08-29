import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import pinyin from "pinyin";
import * as hepburn from "hepburn";
import { convert as hangulRomanization } from "hangul-romanization";
import { transliterate as tr } from "transliteration";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff } from "lucide-react";

function Translator() {
  const [text, setText] = useState("");
  const [translated, setTranslated] = useState("");
  const [displayedText, setDisplayedText] = useState("");
  const [romanized, setRomanized] = useState("");
  const [language, setLanguage] = useState("hi");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const recognitionRef = useRef(null);
  const utteranceRef = useRef(null);

  // Initialize click sound
  const clickAudioRef = useRef(new Audio(process.env.PUBLIC_URL + "/sounds/click.mp3"));

  // Initialize SpeechRecognition once
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
          // Detect language (basic heuristic)
          const detectedLang = event.results[i][0].language || "en-US";
          setLanguage(detectedLang.split("-")[0]);
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setText(finalTranscript + interimTranscript);
    };

    recognition.onerror = (err) => {
      console.error("Speech recognition error:", err);
      setListening(false);
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
  }, []);

  // 🎤 Start/Stop Mic
  const handleMic = () => {
    try { clickAudioRef.current.play(); } catch {}
    if (!recognitionRef.current) {
      alert(
        "⚠️ Your browser/device doesn't support speech recognition.\n" +
          "Try Chrome on Android or a desktop browser."
      );
      return;
    }

    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.lang = "en-US";
      recognitionRef.current.start();
      setListening(true);
    }
  };

  const handleTranslate = async () => {
    try { clickAudioRef.current.play(); } catch {}

    if (!text.trim()) {
      alert("Please enter some text to translate!");
      return;
    }
    setLoading(true);
    setTranslated("");
    setDisplayedText("");
    setRomanized("");

    try {
      const options = {
        method: "POST",
        url: "https://google-translator9.p.rapidapi.com/v2",
        headers: {
          "x-rapidapi-key": "340717b685msh3e79f90f30d0d1ep1679bdjsn860297b5bde0",
          "x-rapidapi-host": "google-translator9.p.rapidapi.com",
          "Content-Type": "application/json",
        },
        data: { q: text, source: "auto", target: language, format: "text" },
      };

      const response = await axios.request(options);

      if (response.data?.data?.translations?.length > 0) {
        const translatedText = response.data.data.translations[0].translatedText;
        setTranslated(translatedText);

        let romanizedText = "";
        if (language === "ja") {
          romanizedText = hepburn.fromKana(translatedText);
        } else if (language === "ko") {
          romanizedText = hangulRomanization(translatedText);
        } else if (language.startsWith("zh")) {
          romanizedText = pinyin(translatedText, { style: pinyin.STYLE_TONE2 })
            .flat()
            .join(" ");
        } else {
          romanizedText = tr(translatedText);
        }

        setRomanized(romanizedText);
      }
    } catch (error) {
      console.error("Translation error:", error);
      alert("Something went wrong. Try again!");
    }
    setLoading(false);
  };

  // Typing animation
  useEffect(() => {
    if (translated) {
      let i = 0;
      setDisplayedText("");
      const interval = setInterval(() => {
        setDisplayedText((prev) => prev + translated.charAt(i));
        i++;
        if (i >= translated.length) clearInterval(interval);
      }, 35);
      return () => clearInterval(interval);
    }
  }, [translated]);

  // 🔊 Speak translated text
  const handleSpeak = () => {
    try { clickAudioRef.current.play(); } catch {}
    if (!translated) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(translated);
      utterance.lang = language;
      utterance.onend = () => setSpeaking(false);
      utteranceRef.current = utterance;
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <motion.div className="flex flex-col items-center justify-center min-h-screen bg-black text-white px-4 sm:px-6 relative overflow-hidden">
      {/* Animated Gradient Background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-pink-700 via-purple-800 to-blue-700 opacity-40 pointer-events-none"
        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      />

      {/* Soft floating orbs */}
      <motion.div
        className="absolute w-72 h-72 bg-pink-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 top-10 left-10 pointer-events-none"
        animate={{ y: [0, -20, 0], x: [0, 20, 0] }}
        transition={{ duration: 10, repeat: Infinity }}
      />
      <motion.div
        className="absolute w-64 h-64 bg-blue-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 bottom-10 right-10 pointer-events-none"
        animate={{ y: [0, 20, 0], x: [0, -20, 0] }}
        transition={{ duration: 12, repeat: Infinity }}
      />

      {/* Title */}
      <h1 className="text-4xl sm:text-6xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-blue-400 drop-shadow-xl">
        ⚡ Text Translator
      </h1>

      {/* Input + Mic */}
      <div className="flex items-center w-full max-w-lg gap-2">
        <motion.textarea
          className="flex-1 h-24 sm:h-32 p-4 rounded-2xl text-gray-900 shadow-xl bg-white/30 backdrop-blur-xl focus:ring-2 focus:ring-pink-400 focus:outline-none"
          placeholder="Enter or speak text..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <motion.button
          onClick={handleMic}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className={`p-3 sm:p-4 rounded-full shadow-lg ${
            listening
              ? "bg-red-500 animate-pulse"
              : "bg-gradient-to-r from-pink-500 to-blue-500"
          }`}
        >
          {listening ? <MicOff size={24} /> : <Mic size={24} />}
        </motion.button>
      </div>

      {/* Dropdown */}
      <motion.select
        className="mt-4 w-full max-w-lg p-3 rounded-2xl text-gray-900 shadow-md bg-white/40 backdrop-blur-md focus:ring-2 focus:ring-pink-400"
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
      >
        <option value="hi">Hindi</option>
        <option value="gu">Gujarati</option>
        <option value="en">English</option>
        <option value="es">Spanish</option>
        <option value="fr">French</option>
        <option value="de">German</option>
        <option value="it">Italian</option>
        <option value="pt">Portuguese</option>
        <option value="ru">Russian</option>
        <option value="ja">Japanese</option>
        <option value="ko">Korean</option>
        <option value="zh-CN">Chinese (Simplified)</option>
        <option value="zh-TW">Chinese (Traditional)</option>
        <option value="ar">Arabic</option>
        <option value="bn">Bengali</option>
        <option value="ta">Tamil</option>
        <option value="te">Telugu</option>
        <option value="mr">Marathi</option>
        <option value="pa">Punjabi</option>
        <option value="ur">Urdu</option>
      </motion.select>

      {/* Translate button */}
      <motion.button
        onClick={handleTranslate}
        className="mt-6 px-8 py-3 font-bold rounded-2xl relative overflow-hidden shadow-lg bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white"
        disabled={loading}
        whileHover={{ scale: loading ? 1 : 1.15 }}
        whileTap={{ scale: 0.9 }}
      >
        {loading ? "Translating..." : "🚀 Translate"}
      </motion.button>

      {/* Result */}
      <AnimatePresence>
        {!loading && translated && (
          <motion.div
            key="result"
            className="mt-8 p-5 sm:p-6 w-full max-w-lg rounded-2xl bg-black/40 backdrop-blur-lg shadow-2xl border-2 border-pink-400"
            initial={{ y: 60, opacity: 0, scale: 0.7 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, type: "spring" }}
          >
            <h2 className="text-xl sm:text-2xl font-bold text-pink-300">🌟 Translated:</h2>
            <p className="mt-3 text-base sm:text-lg text-gray-100">{displayedText}</p>

            {romanized && (
              <motion.p
                className="mt-3 text-base sm:text-lg font-mono tracking-wide text-blue-300"
                animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                🔮 {romanized}
              </motion.p>
            )}

            {/* Speaker */}
            <motion.button
              onClick={handleSpeak}
              className="mt-4 px-5 py-2 rounded-xl bg-gradient-to-r from-green-400 to-teal-500 text-white font-semibold shadow-lg"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {speaking ? "🔊 Stop" : "🔊 Speak"}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
      <br/><br/><br/><br/><br/><br/><br/><br/>
      <footer className="w-full text-center py-4 bg-black/40 text-white text-sm mt-10">
      <p>
        🌍 Translator App © {new Date().getFullYear()} | Built with ❤️ by{" "}
        <span className="font-semibold">Swati Patel</span>
      </p>
    </footer>
    </motion.div>
  );
}

export default Translator;
