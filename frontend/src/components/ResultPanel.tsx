import type { KanjiPrediction, RecognizeStatus } from "../types";

interface Props {
  status: RecognizeStatus;
  predictions: KanjiPrediction[];
  selected: number;
  setSelected: (i: number) => void;
  error: string | null;
  onRetry: () => void;
}

function pct(c: number) {
  return `${(c * 100).toFixed(1)}%`;
}

export default function ResultPanel({ status, predictions, selected, setSelected, error, onRetry }: Props) {
  if (status === "idle") {
    return (
      <section className="panel result-panel">
        <div className="panel-head"><h2>Kết quả nhận diện</h2></div>
        <div className="empty">
          <div className="empty-kanji">漢</div>
          <h3>Chưa có kết quả</h3>
          <p>Vẽ hoặc tải lên 1 chữ Kanji ở khung bên trái,<br />rồi bấm <strong>“Nhận diện”</strong>.</p>
          <ul className="empty-steps">
            <li><span>1</span> Vẽ / tải ảnh chữ viết tay</li>
            <li><span>2</span> Bấm Nhận diện</li>
            <li><span>3</span> Xem top-5 + nghĩa, cách đọc</li>
          </ul>
        </div>
      </section>
    );
  }

  if (status === "loading") {
    return (
      <section className="panel result-panel">
        <div className="panel-head">
          <h2>Kết quả nhận diện</h2>
          <span className="badge loading">⏳ Đang nhận diện…</span>
        </div>
        <div className="skeleton-card">
          <div className="sk sk-kanji" />
          <div className="sk-lines">
            <div className="sk sk-line w60" />
            <div className="sk sk-line w40" />
            <div className="sk sk-line w80" />
          </div>
        </div>
        {[0, 1, 2].map((i) => (
          <div className="sk sk-row" key={i} />
        ))}
        <p className="loading-note">EfficientNet-B3 đang suy luận — Otsu → bbox → 300×300 → softmax top-5…</p>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="panel result-panel">
        <div className="panel-head"><h2>Kết quả nhận diện</h2></div>
        <div className="error-box">
          <div className="error-icon">⚠️</div>
          <h3>Không nhận diện được</h3>
          <p>{error ?? "Ảnh không hợp lệ. Hãy thử ảnh khác."}</p>
          <button className="btn primary" onClick={onRetry}>Thử lại</button>
        </div>
      </section>
    );
  }

  const top = predictions[selected] ?? predictions[0];

  return (
    <section className="panel result-panel">
      <div className="panel-head">
        <h2>Kết quả nhận diện</h2>
        <span className="badge success">✓ Top-{predictions.length}</span>
      </div>

      {/* Thẻ kết quả chính */}
      <article className="top-card">
        <div className="top-kanji">
          <span className="kanji-char">{top.kanji}</span>
          <span className={`jlpt jlpt-${top.jlpt.toLowerCase()}`}>{top.jlpt}</span>
        </div>
        <div className="top-info">
          <div className="conf-row">
            <strong>{pct(top.confidence)}</strong>
            <div className="conf-bar"><i style={{ width: pct(top.confidence) }} /></div>
          </div>
          <h3 className="meaning-vi">{top.meaning_vi}</h3>
          <p className="hiragana">{top.hiragana}</p>
          <div className="readings">
            <div>
              <label>Âm On</label>
              <div className="pills">
                {top.reading_on.length ? top.reading_on.map((r) => <span key={r} className="pill on">{r}</span>)
                  : <span className="pill empty">—</span>}
              </div>
            </div>
            <div>
              <label>Âm Kun</label>
              <div className="pills">
                {top.reading_kun.length ? top.reading_kun.map((r) => <span key={r} className="pill kun">{r}</span>)
                  : <span className="pill empty">—</span>}
              </div>
            </div>
          </div>
          <div className="meta-grid">
            <div><label>Số nét</label><strong>{top.strokes}</strong></div>
            <div><label>Bộ thủ</label><strong>{top.radical_number}</strong></div>
            <div><label>Tần suất</label><strong>#{top.frequency}</strong></div>
            <div><label>Hán-Việt</label><strong>{top.meaning_hv}</strong></div>
          </div>
          <p className="meaning-en">{top.meaning_en}</p>
          <div className="example">📝 {top.example}</div>
          <p className="desc">{top.description}</p>
          <div className="tags">
            {top.tags.map((t) => <span key={t} className="tag">#{t}</span>)}
          </div>
        </div>
      </article>

      {/* Top-5 */}
      <h3 className="sub-title">Các phương án khác (top-5)</h3>
      <ol className="top5">
        {predictions.map((p, i) => (
          <li key={p.train_index}>
            <button
              className={i === selected ? "cand active" : "cand"}
              onClick={() => setSelected(i)}
            >
              <span className="rank">#{i + 1}</span>
              <span className="cand-kanji">{p.kanji}</span>
              <span className="cand-mid">
                <strong>{p.meaning_vi}</strong>
                <span className="cand-read">{p.hiragana}</span>
                <span className="conf-bar sm"><i style={{ width: pct(p.confidence) }} /></span>
              </span>
              <span className="cand-conf">{pct(p.confidence)}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="trace">train_index: {top.train_index} · json_id: {top.json_id} · id: {top.id}</p>
    </section>
  );
}
