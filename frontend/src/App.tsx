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
    const url = URL.createObjectURL(f);
    setPreview(url);
    setStatus((s) => (s === "idle" ? s : s));
  }

  function handleClearAll() {
    if (tab === "draw") {
      setClearSignal((n) => n + 1);
    } else {
      setPreview(null);
      setFileObj(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRecognize() {
    if (!canSubmit) return;
    setStatus("loading");
    setError(null);
    try {
      // TODO(BE): truyền drawData (base64) hoặc fileObj (multipart) lên POST /api/kanji/recognize
      const image = tab === "draw" ? drawData : preview;
      void fileObj;
      const res = await mockRecognize(image);
      if (!res.success || res.predictions.length === 0) {
        throw new Error("Model không trả về kết quả. Hãy thử ảnh rõ hơn.");
      }
      const sorted = [...res.predictions].sort((a, b) => b.confidence - a.confidence);
      setPredictions(sorted);
      setSelected(0);
      setStatus("success");
      const best = sorted[0];
      setHistory((h) =>
        [
          {
            id: Date.now(),
            kanji: best.kanji,
            meaning: best.meaning_vi,
            confidence: best.confidence,
            thumb: image,
            at: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
          },
          ...h,
        ].slice(0, 8)
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra.");
      setStatus("error");
    }
  }

  return (
    <div className="app">
      {/* ===== Header ===== */}
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-mark">漢</span>
            <div>
              <strong>Kanji Recognizer</strong>
              <span>Nhận diện chữ Kanji viết tay bằng AI</span>
            </div>
          </div>
          <nav className="header-nav">
            <span className="chip">EfficientNet-B3</span>
            <span className="chip">250 Kanji</span>
            <span className="chip accent">JLPT N5 / N4</span>
          </nav>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="hero">
        <h1>
          Viết một chữ Kanji <em>— nhận ngay</em> ký tự, cách đọc và ý nghĩa
        </h1>
        <p>
          Dành cho người học tiếng Nhật: nhìn thấy chữ mà không biết đọc?
          Vẽ lại hoặc chụp ảnh — AI sẽ đoán top-5 kèm metadata đầy đủ.
        </p>
      </section>

      {/* ===== Main ===== */}
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
            onRemoveFile={() => { setPreview(null); setFileObj(null); }}
            fileInputRef={fileInputRef}
          />

          <div className="actions">
            <button className="btn primary lg" disabled={!canSubmit} onClick={handleRecognize}>
              {status === "loading" ? "⏳ Đang nhận diện…" : "🔍 Nhận diện"}
            </button>
            <button className="btn ghost lg" onClick={handleClearAll}>
              Xóa ảnh
            </button>
          </div>
          {!canSubmit && status !== "loading" && (
            <p className="hint-warn">⚠️ Hãy vẽ hoặc tải ảnh trước khi bấm Nhận diện.</p>
          )}
          <p className="api-note">
            🔌 UI-only: nút Nhận diện đang dùng <code>mockRecognize()</code>.
            Khi có backend, nối vào <code>POST /api/kanji/recognize</code> trong <code>src/api.ts</code>.
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

      {/* ===== History + Pipeline ===== */}
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
          <div className="panel-head"><h2>⚙️ Pipeline & Model</h2></div>
          <ol className="pipeline">
            <li><strong>Otsu</strong> tách nền</li>
            <li><strong>BBox + padding 25%</strong> & canvas vuông</li>
            <li><strong>Resize 300×300</strong> + normalize ImageNet</li>
            <li><strong>EfficientNet-B3</strong> → softmax top-5</li>
            <li><strong>Ghép metadata</strong> từ jlpt-kanji.json</li>
          </ol>
          <div className="model-row">
            <span>efficientnet_b3_kanji_n4_n5.pt</span>
            <span className="muted">num_classes=250 · image 300px</span>
          </div>
        </div>
      </section>

      <footer className="footer">
        Kanji Recognizer — UI demo (chưa nối model) · Spec: docs/feature-specification.md · Made with ❤️ for Japanese learners
      </footer>
    </div>
  );
}
