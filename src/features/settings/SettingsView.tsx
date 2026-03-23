import React, { useRef, useState } from 'react';
import { Download, FileUp, ClipboardPaste, Trash2, RefreshCw } from 'lucide-react';
import { usePlayerStore, getPersistedPlayerSlice } from '../../stores/playerStore';
import { useReplayStore } from '../../stores/replayStore';
import { useBattleStore } from '../../stores/battleStore';
import { buildSaveFilename, decodeSaveCode, encodeSaveCode } from '../../utils/saveCode';

const SettingsView: React.FC = () => {
  const [confirmText, setConfirmText] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const playerSave = usePlayerStore(getPersistedPlayerSlice);
  const replays = useReplayStore((state) => state.replays);

  const handleHardReset = () => {
    if (confirmText === 'Duodecimfolium') {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleExportSave = async () => {
    setIsBusy(true);
    setStatus(null);

    try {
      const exportedAt = new Date().toISOString();
      const saveCode = await encodeSaveCode({
        exportedAt,
        player: playerSave,
        replays
      });

      const blob = new Blob([saveCode], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = buildSaveFilename(new Date(exportedAt));
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setStatus({ type: 'success', message: '存档已导出为本地 txt 文件。' });
    } catch (error) {
      setStatus({ type: 'error', message: `导出失败：${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setIsBusy(false);
    }
  };

  const applyImportedSave = async (rawText: string) => {
    const snapshot = await decodeSaveCode(rawText);
    useBattleStore.getState().exitBattle();
    usePlayerStore.setState(snapshot.player);
    useReplayStore.setState({ replays: snapshot.replays });
    setStatus({
      type: 'success',
      message: `存档导入成功，来源时间：${new Date(snapshot.exportedAt).toLocaleString() || snapshot.exportedAt}`
    });
  };

  const handleFileImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsBusy(true);
    setStatus(null);

    try {
      const rawText = await file.text();
      await applyImportedSave(rawText);
    } catch (error) {
      setStatus({ type: 'error', message: `导入失败：${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setIsBusy(false);
    }
  };

  const handleClipboardImport = async () => {
    setIsBusy(true);
    setStatus(null);

    try {
      const rawText = await navigator.clipboard.readText();
      await applyImportedSave(rawText);
    } catch (error) {
      setStatus({ type: 'error', message: `导入失败：${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setIsBusy(false);
    }
  };

  const isConfirmValid = confirmText === 'Duodecimfolium';

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-emerald-400">设置</h1>

      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-cyan-300 mb-2">存档码</h2>
          <p className="text-slate-400 text-sm leading-6">
            导出的存档会被压缩、加密并带有校验信息，保存为带时间戳的 txt 文件。你也可以从本地 txt 或剪贴板恢复存档。
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <button
            onClick={handleExportSave}
            disabled={isBusy}
            className="px-4 py-3 rounded font-bold flex items-center justify-center gap-2 transition-all bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            下载存档
          </button>

          <button
            onClick={handleFileImportClick}
            disabled={isBusy}
            className="px-4 py-3 rounded font-bold flex items-center justify-center gap-2 transition-all bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileUp size={18} />
            txt 导入
          </button>

          <button
            onClick={handleClipboardImport}
            disabled={isBusy}
            className="px-4 py-3 rounded font-bold flex items-center justify-center gap-2 transition-all bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ClipboardPaste size={18} />
            剪贴板导入
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,text/plain"
          onChange={handleFileImport}
          className="hidden"
        />

        {status && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              status.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                : 'border-red-500/40 bg-red-500/10 text-red-200'
            }`}
          >
            {status.message}
          </div>
        )}
      </div>

      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h2 className="text-xl font-bold mb-4 text-red-400 flex items-center gap-2">
          <Trash2 />
          危险区域
        </h2>

        <p className="text-slate-400 mb-4">
          如果你想彻底重开，本操作会清空所有本地存档。
        </p>

        <p className="text-slate-500 text-sm mb-4">
          请输入 <span className="font-mono text-emerald-400 font-bold select-all">Duodecimfolium</span> 以确认。
        </p>

        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Type 'Duodecimfolium'"
          className="w-full bg-slate-900 border border-slate-700 rounded p-3 mb-4 text-white focus:border-red-500 outline-none transition-colors"
        />

        <button
          onClick={handleHardReset}
          disabled={!isConfirmValid}
          className={`px-6 py-3 rounded font-bold flex items-center gap-2 w-full justify-center transition-all ${
            isConfirmValid
              ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-[0_0_15px_rgba(220,38,38,0.5)]'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'
          }`}
        >
          <RefreshCw size={20} />
          Hard Reset
        </button>
      </div>
    </div>
  );
};

export default SettingsView;
