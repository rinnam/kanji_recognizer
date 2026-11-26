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

interface ScenarioSttProfile {
  initialPrompt: string;
  hotwords: string;
  homophoneFixes: Array<[RegExp, string]>;
}

const DEFAULT_STT_PROFILE: ScenarioSttProfile = {
  initialPrompt:
    '本日はよろしくお願いいたします。失礼いたします。自己紹介、自己PR、志望動機、逆質問、履歴書、御社、弊社。えーと、あのー、うーん、そのー。',
  hotwords:
    '失礼いたします 自己紹介 自己PR 志望動機 逆質問 履歴書 エンジニア アルバイト 留学 日本語学校',
  homophoneFixes: [],
};

const SCENARIO_STT_PROFILES: Record<string, ScenarioSttProfile> = {
  roleplay_restaurant: {
    initialPrompt:
      'いらっしゃいませ。何名様でしょうか。お品書き、鮭定食、焼き鮭定食、カツ丼、辛口味噌ラーメン、海鮮天ぷら盛り合わせ、野菜天ぷら定食、ウーロン茶、生ビール、抹茶アイスをお願いします。アレルギーがあります。お箸、お会計お願いします。ごちそうさまでした。',
    hotwords:
      '鮭定食 焼き鮭 カツ丼 辛口味噌ラーメン 海鮮天ぷら盛り合わせ 野菜天ぷら定食 ウーロン茶 生ビール 抹茶アイス お会計 お箸 ごちそうさまでした アレルギー 何名様',
    homophoneFixes: [
      [/酒定食/g, '鮭定食'],
      [/酒の定食/g, '鮭の定食'],
      [/焼き?酒(定食)?/g, '焼き鮭$1'],
      [/お橋/g, 'お箸'],
    ],
  },
  roleplay_clinic: {
    initialPrompt:
      'こんにちは。問診票、保険証。熱があります。喉が痛くて咳が出ます。症状、骨折、捻挫、打撲、右足、左足、レントゲン、お腹が痛い、吐き気、薬のアレルギー、処方箋、痛み止め、医師。',
    hotwords:
      '問診票 保険証 症状 発熱 咳 喉 骨折 捻挫 打撲 レントゲン 腹痛 吐き気 アレルギー 処方箋 痛み止め 整形外科 内科',
    homophoneFixes: [
      [/賞状(が|は|を|について)/g, '症状$1'],
      [/ほけんしょ(?![う])/g, '保険証'],
    ],
  },
  roleplay_horenso: {
    initialPrompt:
      'お疲れ様です。進捗の報告、連絡、相談があります。報連相、ログイン画面、決済API、単体テスト、ステージング環境、タイムアウト、障害、故障、修正、納期、締め切り、リリース、レビュー。',
    hotwords:
      '報連相 進捗 報告 連絡 相談 決済API ログイン画面 単体テスト ステージング タイムアウト 障害 故障 修正 納期 締め切り リリース レビュー',
    homophoneFixes: [],
  },
};

function extractJapaneseTerms(text?: string): string[] {
  if (!text) return [];
  const matches = text.match(/[\u3040-\u30ff\u3400-\u9fffー]{2,12}/g) ?? [];
  return [...new Set(matches)].slice(0, 12);
}

function buildSttHints(scenarioId?: string, contextHint?: string): {
  initialPrompt: string;
  hotwords: string;
  homophoneFixes: Array<[RegExp, string]>;
} {
  const profile =
    (scenarioId && SCENARIO_STT_PROFILES[scenarioId]) || DEFAULT_STT_PROFILE;
  const extraJa = extractJapaneseTerms(contextHint);
  if (extraJa.length === 0) {
    return profile;
  }
  const extraStr = extraJa.join(' ');
  return {
    initialPrompt: `${profile.initialPrompt} ${extraStr}`,
    hotwords: `${profile.hotwords} ${extraStr}`,
    homophoneFixes: profile.homophoneFixes,
  };
}

/**
 * Transcribes spoken Japanese audio 100% locally via faster-whisper (0 cloud tokens).
 * Uses scenario-aware initial_prompt + hotwords to disambiguate Japanese homophones (e.g. 鮭定食 vs 酒定食).
 */
export async function transcribeWithLocalWhisper(
  base64Data: string,
  mimeType: string,
  options?: { scenarioId?: string | undefined; contextHint?: string | undefined },
): Promise<string> {
  await ensureWorker();
  if (!workerProc) {
    throw new Error('Whisper worker is not running');
  }

  const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('wav') ? 'wav' : 'webm';
  const tempFile = path.join(os.tmpdir(), `kanji-nest-stt-${crypto.randomUUID()}.${ext}`);
  await fs.writeFile(tempFile, Buffer.from(base64Data, 'base64'));

  const hints = buildSttHints(options?.scenarioId, options?.contextHint);
  const id = crypto.randomUUID();
  try {
    let text = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingJobs.delete(id);
        reject(new Error('Whisper transcription timeout'));
      }, 30000);
      pendingJobs.set(id, { resolve, reject, timer });
      workerProc!.stdin.write(
        `${JSON.stringify({
          id,
          path: tempFile,
          initial_prompt: hints.initialPrompt,
          hotwords: hints.hotwords,
        })}\n`,
      );
    });
    text = text.trim();
    for (const [pattern, replacement] of hints.homophoneFixes) {
      text = text.replace(pattern, replacement);
    }
    return text;
  } finally {
    await fs.unlink(tempFile).catch(() => {});
  }
}
