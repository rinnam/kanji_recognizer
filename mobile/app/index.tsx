import { useCallback, useEffect, useRef, useState } from 'react';
import type { PullResult, VocabularyDto } from '../../packages/contracts/src/study';
import { AppState } from 'react-native';
import { LibraryOverview } from '../src/LibraryOverview';
import { libraryEndpoint, loadLibrary, pushLibrary, saveQuiz } from '../src/library-source';
import { review } from '../src/study-model';
import { resetSrsProgress } from '../../frontend/src/features/flashcard/model/reset';
import { folderWrites } from '../src/folder-actions';
import { sampleLibrary } from '../src/sample-library';
import { overlayPending, stillPending } from '../src/sync-merge';
import {
  createLocalWord, emptyWorkspace, readLocalWorkspace, readServerCache,
  saveLocalWorkspace, saveServerCache, type LocalWorkspace, type WordInput,
} from '../src/workspace-storage';

export default function Index() {
  const [remote, setRemote] = useState<PullResult>();
  const [local, setLocal] = useState<LocalWorkspace>();
  const [storageError, setStorageError] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [changed, setChanged] = useState(false);
  const [preview, setPreview] = useState(false);
  const pending = useRef(Promise.resolve());
  const latest = useRef(emptyWorkspace);
  const flight = useRef<AbortController | null>(null);

  const updateLocal = useCallback((update: (current: LocalWorkspace) => LocalWorkspace, userEdit = true) => {
    const operation = pending.current.then(async () => {
      const next = update(latest.current);
      await saveLocalWorkspace(next);
      latest.current = next;
      setLocal(next);
      if (userEdit) setChanged(true);
    });
    pending.current = operation.catch(() => undefined);
    return operation;
  }, []);

  const sync = useCallback(async (send: boolean) => {
    if (!libraryEndpoint || flight.current) return;
    const controller = new AbortController();
    flight.current = controller;
    setBusy(true);
    setError(undefined);
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      await pending.current;
      const changes = send ? latest.current : emptyWorkspace;
      if (changes.folders.length || changes.vocabularies.length) await pushLibrary(changes, controller.signal);
      const result = await loadLibrary(controller.signal);
      if (flight.current !== controller) return;
      await saveServerCache(libraryEndpoint, result);
      setRemote(result);
      setPreview(false);
      if (changes.folders.length || changes.vocabularies.length) {
        await updateLocal(current => ({
          folders: stillPending(current.folders, changes.folders, result.folders),
          vocabularies: stillPending(current.vocabularies, changes.vocabularies, result.vocabularies),
        }), false);
      }
    } catch (reason) {
      if (flight.current === controller) setError(controller.signal.aborted ? 'Máy chủ chưa phản hồi.' :
        reason instanceof Error ? reason.message : 'Không kết nối được máy chủ.');
    } finally {
      clearTimeout(timer);
      if (flight.current === controller) {
        flight.current = null;
        setBusy(false);
      }
    }
  }, [updateLocal]);

  useEffect(() => {
    if (!changed || busy || !local) return;
    const timer = setTimeout(() => {
      setChanged(false);
      if (local.folders.length || local.vocabularies.length) void sync(true);
    }, 3500);
    return () => clearTimeout(timer);
  }, [changed, local, busy, sync]);

  const ready = !!local;
  useEffect(() => {
    if (!ready) return;
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void sync(true);
    });
    return () => subscription.remove();
  }, [ready, sync]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const value = await readLocalWorkspace();
      const cache = libraryEndpoint ? await readServerCache(libraryEndpoint).catch(() => undefined) : undefined;
      if (!active) return;
      latest.current = value;
      setLocal(value);
      setRemote(cache);
      void sync(false);
    })().catch(() => { if (active) setStorageError('Không đọc được thư viện trên thiết bị.'); });
    return () => {
      active = false;
      flight.current?.abort();
      flight.current = null;
    };
  }, [sync]);

  const source = preview ? sampleLibrary : remote;
  const library = local && {
    serverTime: source?.serverTime ?? '',
    folders: overlayPending(source?.folders ?? [], local.folders),
    vocabularies: overlayPending(source?.vocabularies ?? [], local.vocabularies),
  };
  const count = local ? local.folders.length + local.vocabularies.length : 0;
  const status = busy ? 'Đang đồng bộ…' : error ? 'Ngoại tuyến / lỗi đồng bộ' : count ? 'Chờ đồng bộ' :
    remote ? 'Đã đồng bộ' : 'Chưa đồng bộ lần đầu';
  const writableFolder = (id: string | null) => preview && id?.startsWith('sample-') ? null : id;

  return <LibraryOverview
    library={library} status={status} busy={busy}
    onRate={local && !preview ? (word, rating) => updateLocal(current => {
      const latestWord = overlayPending(remote?.vocabularies ?? [], current.vocabularies).find(w => w.id === word.id);
      if (!latestWord || latestWord.deletedAt) throw new Error('Thẻ đã bị xóa.');
      const now = new Date(Math.max(Date.now(), Date.parse(latestWord.updatedAt) + 1));
      const result = review({ interval: latestWord.srsInterval, repetition: latestWord.srsRepetition,
        easeFactor: latestWord.srsEaseFactor }, rating, now);
      const next = { ...latestWord, updatedAt: now.toISOString(), srsInterval: result.interval,
        srsRepetition: result.repetition, srsEaseFactor: result.easeFactor, srsNextReview: result.nextReview.toISOString() };
      return { ...current, vocabularies: overlayPending(current.vocabularies, [next]) };
    }) : undefined}
    onReset={local && !preview ? words => updateLocal(current => {
      const ids = new Set(words.map(w => w.id));
      const targets = overlayPending(remote?.vocabularies ?? [], current.vocabularies)
        .filter(w => ids.has(w.id) && !w.deletedAt);
      return { ...current, vocabularies: overlayPending(current.vocabularies, targets.map(w =>
        resetSrsProgress(w, new Date(Math.max(Date.now(), Date.parse(w.updatedAt) + 1))))) };
    }) : undefined}
    onSaveQuiz={remote && !count && !busy && !preview ? saveQuiz : undefined}
    error={storageError ?? error ?? (!libraryEndpoint ? 'Chưa cấu hình địa chỉ máy chủ.' : undefined)}
    onRetry={libraryEndpoint && local ? () => void sync(true) : undefined}
    sample={preview}
    onSample={!remote && !preview && !busy ? () => setPreview(true) : undefined}
    onAddWords={local && !storageError ? (inputs: WordInput[], folderId: string | null) => updateLocal((current) => ({
      ...current, vocabularies: [...current.vocabularies, ...inputs.map((input) => createLocalWord(input, writableFolder(folderId)))],
    })) : undefined}
    onEditWord={local ? (word: VocabularyDto, input: WordInput) => updateLocal(current => ({
      ...current, vocabularies: [...current.vocabularies.filter(row => row.id !== word.id),
        { ...word, ...input, updatedAt: new Date(Math.max(Date.now(), Date.parse(word.updatedAt) + 1)).toISOString() }],
    })) : undefined}
    onFolderAction={local && !preview ? action => updateLocal(current => {
      const writes = folderWrites({ folders: overlayPending(remote?.folders ?? [], current.folders),
        vocabularies: overlayPending(remote?.vocabularies ?? [], current.vocabularies) }, action);
      return { folders: overlayPending(current.folders, writes.folders),
        vocabularies: overlayPending(current.vocabularies, writes.vocabularies) };
    }) : undefined}
  />;
}
