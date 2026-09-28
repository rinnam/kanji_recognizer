import { useRef, useState } from "react";
import InputPanel from "./components/InputPanel";
import ResultPanel from "./components/ResultPanel";
import { mockRecognize } from "./api";
import type { InputTab, KanjiPrediction, RecognizeStatus } from "./types";
import "./App.css";

interface HistoryItem {
  id: number;
  kanji: string;
  meaning: string;
  confidence: number;
  thumb: string | null;
  at: string;
}

export default function App() {
  const [tab, setTab] = useState<InputTab>("draw");
  const [brushSize, setBrushSize] = useState(18);
  const [drawData, setDrawData] = useState<string | null>(null);
  const [hasInk, setHasInk] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileObj, setFileObj] = useState<File | null>(null);
  const [clearSignal, setClearSignal] = useState(0);
  const [undoSignal, setUndoSignal] = useState(0);

  const [status, setStatus] = useState<RecognizeStatus>("idle");
  const [predictions, setPredictions] = useState<KanjiPrediction[]>([]);
  const [selected, setSelected] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canSubmit =
    status !== "loading" && (tab === "draw" ? hasInk : !!preview);

  function handleFile(f: File | null) {
    if (!f) return;
    setFileObj(f);
    setPreview(URL.createObjectURL(f));
  }

  function removeFile() {
    setPreview(null);
    setFileObj(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleClearAll() {
    if (tab === "draw") {
      setClearSignal((n) => n + 1);
    } else {
      removeFile();
    }
  }

  async function handleRecognize() {
    if (!canSubmit) return;
    setStatus("loading");
    setError(null);
    try {
      // TODO(BE): gửi drawData (base64) hoặc fileObj (multipart) tới POST /api/kanji/recognize.
      const image = tab === "draw" ? drawData : preview;
      void fileObj;
      const res = await mockRecognize(image);
      if (!res.success || res.predictions.length === 0) {
        throw new Error("Demo không trả về kết quả. Hãy thử ảnh rõ hơn.");
      }
      const sorted = [...res.predictions].sort((a, b) => b.confidence - a.confidence);
      setPredictions(sorted);
      setSelected(0);
      setStatus("success");
      const best = sorted[0];
      setHistory((h) => [
        {
          id: Date.now(),
          kanji: best.kanji,
          meaning: best.meaning_vi,
          confidence: best.confidence,
          thumb: image,
          at: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        },
        ...h,
      ].slice(0, 8));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra.");
      setStatus("error");
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-mark">漢</span>
            <div>
              <strong>Kanji Recognizer</strong>
              <span>Giao diện demo nhận diện chữ Kanji viết tay</span>
            </div>
          </div>
          <nav className="header-nav" aria-label="Trạng thái ứng dụng">
            <span className="chip accent">UI demo</span>
          </nav>
        </div>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <span className="hero-kicker">書く · 読む · 理解する</span>
        <h1 id="hero-title">Viết một chữ Kanji <em>— xem kết quả minh họa</em></h1>
        <p>Vẽ lại hoặc tải ảnh một chữ Kanji để trải nghiệm luồng nhận diện của giao diện.</p>
        <div className="hero-meta" aria-label="Các bước sử dụng">
          <span><b>01</b> Vẽ hoặc tải ảnh</span>
          <i aria-hidden="true" />
          <span><b>02</b> Xem kết quả demo</span>
          <i aria-hidden="true" />
          <span><b>03</b> Tham khảo cách đọc</span>
        </div>
      </section>

      <main className="main-grid">
        <div className="left-col">
          <InputPanel
            tab={tab}
            setTab={setTab}
            brushSize={brushSize}
            setBrushSize={setBrushSize}
            onDrawChange={(ink, url) => { setHasInk(ink); setDrawData(url); }}
            clearSignal={clearSignal}
            undoSignal={undoSignal}
            onClear={() => setClearSignal((n) => n + 1)}
            onUndo={() => setUndoSignal((n) => n + 1)}
            preview={preview}
            onFile={handleFile}
            onRemoveFile={removeFile}
            fileInputRef={fileInputRef}
          />

          <div className="actions">
            <button className="btn primary lg" disabled={!canSubmit} onClick={handleRecognize}>
              {status === "loading" ? "⏳ Đang nhận diện…" : "🔍 Nhận diện"}
            </button>
            <button className="btn ghost lg" onClick={handleClearAll}>Xóa ảnh</button>
          </div>
          {!canSubmit && status !== "loading" && (
            <p className="hint-warn">⚠️ Hãy vẽ hoặc tải ảnh trước khi bấm Nhận diện.</p>
          )}
          <p className="api-note">
            🔌 UI demo đang dùng dữ liệu giả lập. Khi tích hợp backend, dùng <code>POST /api/kanji/recognize</code> trong <code>src/api.ts</code>.
          </p>
        </div>

        <div className="right-col">
          <ResultPanel
            status={status}
            predictions={predictions}
            selected={selected}
            setSelected={setSelected}
            error={error}
            onRetry={handleRecognize}
          />
        </div>
      </main>

      <section className="bottom-grid">
        <div className="panel">
          <div className="panel-head"><h2>🕘 Lịch sử gần đây</h2></div>
          {history.length === 0 ? (
            <p className="muted">Chưa có lượt nhận diện nào trong phiên này.</p>
          ) : (
            <ul className="history">
              {history.map((h) => (
                <li key={h.id}>
                  {h.thumb ? <img src={h.thumb} alt={h.kanji} /> : <span className="h-kanji">{h.kanji}</span>}
                  <div>
                    <strong>{h.kanji} <span className="muted">· {h.meaning}</span></strong>
                    <span className="muted sm">{(h.confidence * 100).toFixed(1)}% · {h.at}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel">
          <div className="panel-head"><h2>ℹ️ Chế độ demo</h2></div>
          <p className="muted">Kết quả và metadata hiện là dữ liệu minh họa của giao diện; chưa gọi dịch vụ hoặc mô hình thật.</p>
        </div>
      </section>

      <footer className="footer">Kanji Recognizer — UI demo · Endpoint tích hợp dự kiến: POST /api/kanji/recognize</footer>
    </div>
  );
}
