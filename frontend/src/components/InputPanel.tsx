import DrawCanvas from "./DrawCanvas";
import type { InputTab } from "../types";

interface Props {
  tab: InputTab;
  setTab: (t: InputTab) => void;
  brushSize: number;
  setBrushSize: (n: number) => void;
  onDrawChange: (hasInk: boolean, dataUrl: string | null) => void;
  clearSignal: number;
  undoSignal: number;
  onClear: () => void;
  onUndo: () => void;
  preview: string | null;
  onFile: (f: File | null) => void;
  onRemoveFile: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export default function InputPanel(props: Props) {
  const {
    tab, setTab, brushSize, setBrushSize, onDrawChange,
    clearSignal, undoSignal, onClear, onUndo,
    preview, onFile, onRemoveFile, fileInputRef,
  } = props;

  return (
    <section className="panel input-panel">
      <div className="panel-head">
        <h2>Ảnh đầu vào</h2>
        <div className="tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === "draw"}
            className={tab === "draw" ? "tab active" : "tab"}
            onClick={() => setTab("draw")}
          >
            ✍️ Vẽ tay
          </button>
          <button
            role="tab"
            aria-selected={tab === "upload"}
            className={tab === "upload" ? "tab active" : "tab"}
            onClick={() => setTab("upload")}
          >
            🖼️ Tải ảnh
          </button>
        </div>
      </div>

      {tab === "draw" ? (
        <>
          <DrawCanvas
            brushSize={brushSize}
            onChange={onDrawChange}
            clearSignal={clearSignal}
            undoSignal={undoSignal}
          />
          <div className="toolbar">
            <label className="brush">
              Nét vẽ
              <input
                type="range"
                aria-label="Độ dày nét vẽ"
                min={4}
                max={36}
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
              />
              <span>{brushSize}px</span>
            </label>
            <div className="toolbar-btns">
              <button className="btn ghost" onClick={onUndo}>↩ Hoàn tác</button>
              <button className="btn ghost" onClick={onClear}>🗑 Xóa</button>
            </div>
          </div>
        </>
      ) : (
        <div
          className={preview ? "dropzone has-file" : "dropzone"}
          role="button"
          tabIndex={0}
          aria-label={preview ? "Thay ảnh Kanji đã tải lên" : "Chọn hoặc kéo thả ảnh Kanji"}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFile(e.dataTransfer.files?.[0] ?? null);
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
          {preview ? (
            <div className="preview-box">
              <img src={preview} alt="Ảnh Kanji tải lên" />
              <button
                className="btn ghost sm"
                onClick={(e) => { e.stopPropagation(); onRemoveFile(); }}
              >
                ✕ Gỡ ảnh
              </button>
            </div>
          ) : (
            <div className="dropzone-empty">
              <div className="drop-icon">📥</div>
              <p><strong>Kéo & thả</strong> hoặc <u>bấm để chọn ảnh</u></p>
              <span>PNG / JPG — nên là 1 chữ duy nhất, nền sáng</span>
            </div>
          )}
        </div>
      )}

      <p className="note">
        💡 Mẹo: ảnh càng rõ nét, càng ít khoảng trắng thừa thì kết quả càng chính xác.
        Hỗ trợ JLPT N5 / N4 — 250 ký tự.
      </p>
    </section>
  );
}
