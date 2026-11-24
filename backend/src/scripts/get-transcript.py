import json
import re
import sys
from urllib.parse import parse_qs, urlparse

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    NoTranscriptFound,
    TranscriptsDisabled,
    VideoUnavailable,
)

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def extract_video_id(value: str) -> str:
    value = value.strip()
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", value):
        return value

    parsed = urlparse(value)
    if parsed.hostname and "youtu.be" in parsed.hostname:
        return parsed.path.strip("/").split("/")[0]

    video_id = parse_qs(parsed.query).get("v", [None])[0]
    if video_id:
        return video_id

    match = re.search(r"/(?:embed|shorts)/([^/?&#]+)", value)
    return match.group(1) if match else value


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing video ID parameter."}))
        sys.exit(1)

    raw_id = sys.argv[1]
    video_id = extract_video_id(raw_id)

    try:
        api = YouTubeTranscriptApi()
        transcript = api.fetch(video_id, languages=["ja", "en"])
        lines = [
            {
                "start": round(float(l.start), 2),
                "duration": round(float(l.duration), 2),
                "text": str(l.text).strip(),
            }
            for l in transcript
        ]
        print(json.dumps({"videoId": video_id, "lines": lines}, ensure_ascii=False))
    except TranscriptsDisabled:
        print(json.dumps({"error": "Video này đã tắt tính năng phụ đề."}))
        sys.exit(2)
    except NoTranscriptFound:
        print(json.dumps({"error": "Không tìm thấy phụ đề tiếng Nhật hoặc tiếng Anh cho video này."}))
        sys.exit(3)
    except VideoUnavailable:
        print(json.dumps({"error": "Video không tồn tại hoặc không thể truy cập."}))
        sys.exit(4)
    except Exception as error:
        print(json.dumps({"error": f"Lỗi lấy phụ đề: {error}"}))
        sys.exit(5)


if __name__ == "__main__":
    main()
