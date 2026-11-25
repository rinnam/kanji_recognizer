import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { type AnalyzedToken, tokenizeText } from './tokenizer.service.js';

const execFileAsync = promisify(execFile);

export interface TranscriptLine {
  start: number;
  duration: number;
  text: string;
  tokens: AnalyzedToken[];
}

export interface VideoTranscriptResult {
  videoId: string;
  lines: TranscriptLine[];
}

const transcriptCache = new Map<string, VideoTranscriptResult>();

function findPythonExe(): string {
  const candidates = [
    path.resolve(process.cwd(), 'test_module/ja-vi-translator/.venv/Scripts/python.exe'),
    path.resolve(process.cwd(), '../test_module/ja-vi-translator/.venv/Scripts/python.exe'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return 'python';
}

function findScriptPath(): string {
  const candidates = [
    path.resolve(process.cwd(), 'src/scripts/get-transcript.py'),
    path.resolve(process.cwd(), 'backend/src/scripts/get-transcript.py'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return path.resolve(process.cwd(), 'src/scripts/get-transcript.py');
}

export async function fetchVideoTranscript(videoId: string): Promise<VideoTranscriptResult> {
  const cleanId = videoId.trim();
  if (!cleanId) {
    throw new Error('Video ID không được để trống.');
  }

  const cached = transcriptCache.get(cleanId);
  if (cached) return cached;

  const pythonExe = findPythonExe();
  const scriptPath = findScriptPath();

  try {
    const { stdout, stderr } = await execFileAsync(pythonExe, [scriptPath, cleanId], {
      timeout: 25000,
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf-8',
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
    });

    if (stderr && !stdout) {
      throw new Error(stderr.trim());
    }

    const parsed = JSON.parse(stdout) as { videoId: string; lines?: Array<{ start: number; duration: number; text: string }>; error?: string };
    if (parsed.error) {
      throw new Error(parsed.error);
    }

    if (!Array.isArray(parsed.lines)) {
      throw new Error('Định dạng phụ đề trả về không hợp lệ.');
    }

    // Tokenize each line
    const linesWithTokens: TranscriptLine[] = [];
    for (const rawLine of parsed.lines) {
      const tokens = await tokenizeText(rawLine.text);
      linesWithTokens.push({
        start: rawLine.start,
        duration: rawLine.duration,
        text: rawLine.text,
        tokens,
      });
    }

    const result: VideoTranscriptResult = {
      videoId: cleanId,
      lines: linesWithTokens,
    };

    transcriptCache.set(cleanId, result);
    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(message);
  }
}
