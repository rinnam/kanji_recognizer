import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';

interface PendingJob {
  resolve: (text: string) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

let workerProc: ChildProcessWithoutNullStreams | null = null;
let workerReadyPromise: Promise<void> | null = null;
const pendingJobs = new Map<string, PendingJob>();

function resetWorker(reason: string): void {
  if (workerProc) {
    try {
      workerProc.kill();
    } catch {
      // ignore
    }
  }
  workerProc = null;
  workerReadyPromise = null;
  for (const [id, job] of pendingJobs.entries()) {
    clearTimeout(job.timer);
    job.reject(new Error(reason));
    pendingJobs.delete(id);
  }
}

function ensureWorker(): Promise<void> {
  if (workerProc && workerReadyPromise) {
    return workerReadyPromise;
  }

  const scriptPath = path.resolve(process.cwd(), 'scripts', 'whisper_worker.py');
  const pythonCmd = process.env.PYTHON_BIN || 'python';

  const proc = spawn(pythonCmd, [scriptPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, PYTHONIOENCODING: 'utf-8', HF_HUB_DISABLE_SYMLINKS_WARNING: '1' },
  });
  workerProc = proc;

  const rl = readline.createInterface({ input: proc.stdout });

  workerReadyPromise = new Promise<void>((resolveReady, rejectReady) => {
    let isReady = false;
    const readyTimeout = setTimeout(() => {
      if (!isReady) {
        resetWorker('Whisper worker startup timeout');
        rejectReady(new Error('Whisper worker startup timeout'));
      }
    }, 120000);

    rl.on('line', (line) => {
      try {
        const msg = JSON.parse(line) as {
          ready?: boolean;
          id?: string;
          text?: string;
          error?: string;
        };
        if (msg.ready && !isReady) {
          isReady = true;
          clearTimeout(readyTimeout);
          resolveReady();
          return;
        }
        if (msg.id) {
          const job = pendingJobs.get(msg.id);
          if (!job) return;
          pendingJobs.delete(msg.id);
          clearTimeout(job.timer);
          if (msg.error) {
            job.reject(new Error(msg.error));
          } else {
            job.resolve(msg.text ?? '');
          }
        }
      } catch {
        // ignore non-JSON stdout lines
      }
    });

    proc.on('exit', (code) => {
      clearTimeout(readyTimeout);
      if (!isReady) {
        rejectReady(new Error(`Whisper worker exited with code ${code ?? 'unknown'}`));
      }
      resetWorker(`Whisper worker exited (${code ?? 'unknown'})`);
    });

    proc.on('error', (err) => {
      clearTimeout(readyTimeout);
      if (!isReady) rejectReady(err);
      resetWorker(`Whisper worker error: ${err.message}`);
    });
  });

  return workerReadyPromise;
}

/**
 * Transcribes spoken Japanese audio 100% locally via faster-whisper (0 cloud tokens).
 */
export async function transcribeWithLocalWhisper(
  base64Data: string,
  mimeType: string,
): Promise<string> {
  await ensureWorker();
  if (!workerProc) {
    throw new Error('Whisper worker is not running');
  }

  const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('wav') ? 'wav' : 'webm';
  const tempFile = path.join(os.tmpdir(), `kanji-nest-stt-${crypto.randomUUID()}.${ext}`);
  await fs.writeFile(tempFile, Buffer.from(base64Data, 'base64'));

  const id = crypto.randomUUID();
  try {
    const text = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingJobs.delete(id);
        reject(new Error('Whisper transcription timeout'));
      }, 30000);
      pendingJobs.set(id, { resolve, reject, timer });
      workerProc!.stdin.write(`${JSON.stringify({ id, path: tempFile })}\n`);
    });
    return text.trim();
  } finally {
    await fs.unlink(tempFile).catch(() => {});
  }
}
