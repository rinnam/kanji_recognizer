import json
import sys
import traceback
import av
from faster_whisper import WhisperModel

# PyAV 17+/19+ removed the `metadata_errors` kwarg that faster-whisper 1.2.x passes to av.open().
_orig_av_open = av.open


def _compat_av_open(*args, **kwargs):
    try:
        return _orig_av_open(*args, **kwargs)
    except TypeError:
        kwargs.pop("metadata_errors", None)
        return _orig_av_open(*args, **kwargs)


av.open = _compat_av_open

sys.stdout.reconfigure(encoding="utf-8")
sys.stdin.reconfigure(encoding="utf-8")

DEFAULT_INITIAL_PROMPT = (
    "本日はよろしくお願いいたします。失礼いたします。自己紹介をお願いいたします。"
    "えーと、あのー、うーん、そのー。"
)


def main() -> None:
    model = WhisperModel("base", device="cpu", compute_type="int8")
    print(json.dumps({"ready": True}, ensure_ascii=False), flush=True)

    for raw_line in sys.stdin:
        line = raw_line.strip()
        if not line:
            continue
        req_id = ""
        try:
            payload = json.loads(line)
            req_id = str(payload.get("id", ""))
            audio_path = str(payload.get("path", ""))
            initial_prompt = str(payload.get("initial_prompt") or "").strip() or DEFAULT_INITIAL_PROMPT
            hotwords = str(payload.get("hotwords") or "").strip() or None
            transcribe_kwargs = {
                "language": "ja",
                "beam_size": 2,
                "vad_filter": True,
                "initial_prompt": initial_prompt,
            }
            if hotwords:
                transcribe_kwargs["hotwords"] = hotwords
            segments, _info = model.transcribe(audio_path, **transcribe_kwargs)
            text = "".join(seg.text for seg in segments).strip()
            print(
                json.dumps({"id": req_id, "text": text}, ensure_ascii=False),
                flush=True,
            )
        except Exception as exc:
            print(
                json.dumps(
                    {
                        "id": req_id,
                        "error": f"{exc.__class__.__name__}: {exc}",
                        "trace": traceback.format_exc(limit=2),
                    },
                    ensure_ascii=False,
                ),
                flush=True,
            )


if __name__ == "__main__":
    main()
