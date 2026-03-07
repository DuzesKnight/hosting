'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { serversApi, pluginsApi, playersApi } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Terminal, FolderOpen, Database, Archive, Globe, Settings, Puzzle, Users,
  Play, Square, RotateCcw, Skull, Trash2, ChevronLeft, Loader2, Send,
  File, Folder, ArrowLeft, Edit3, Plus, Upload, X, Download, RefreshCw,
  Search, ExternalLink, ShieldAlert, Clock, AlertTriangle, CheckCircle,
  MemoryStick, Cpu, HardDrive, Copy, Eye, EyeOff, UserMinus, UserPlus,
  Shield, Ban, Gavel, CalendarClock, Activity, Lock, Unlock, RotateCw,
  FileArchive, Save
} from 'lucide-react';
import Link from 'next/link';

const BASE_TABS = [
  { id: 'console', label: 'Console', icon: Terminal },
  { id: 'files', label: 'Files', icon: FolderOpen },
  { id: 'databases', label: 'Databases', icon: Database },
  { id: 'backups', label: 'Backups', icon: Archive },
  { id: 'network', label: 'Network', icon: Globe },
  { id: 'startup', label: 'Startup', icon: Settings },
  { id: 'schedules', label: 'Schedules', icon: CalendarClock },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const STATUS_CFG: Record<string, { text: string; dot: string; bg: string; border: string }> = {
  running: { text: 'text-emerald-400', dot: 'bg-emerald-400', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
  starting: { text: 'text-yellow-400', dot: 'bg-yellow-400 animate-pulse', bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.2)' },
  stopping: { text: 'text-orange-400', dot: 'bg-orange-400', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)' },
  offline: { text: 'text-gray-400', dot: 'bg-gray-500', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)' },
};

function stripAnsi(s: string) { return s.replace(/\x1b\[[0-9;]*m/g, ''); }

export default function ServerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [server, setServer] = useState<any>(null);
  const [tab, setTab] = useState('console');
  const [loading, setLoading] = useState(true);
  const [powerLoading, setPowerLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [renewLoading, setRenewLoading] = useState(false);
  const [renewalCost, setRenewalCost] = useState<number | null>(null);
  const [pluginProfile, setPluginProfile] = useState<any>(null);

  const fetchServer = useCallback(async () => {
    try {
      const res = await serversApi.get(id);
      setServer(res.data);
    } catch { toast.error('Failed to load server'); router.push('/dashboard/servers'); }
    finally { setLoading(false); }
  }, [id, router]);

  useEffect(() => { fetchServer(); }, [fetchServer]);

  useEffect(() => {
    if (!server) return;
    const iv = setInterval(fetchServer, 15000);
    return () => clearInterval(iv);
  }, [server, fetchServer]);

  const handlePower = async (signal: string) => {
    setPowerLoading(true);
    try { await serversApi.power(id, signal); toast.success(`Power: ${signal}`); setTimeout(fetchServer, 2000); }
    catch { toast.error('Power action failed'); }
    finally { setPowerLoading(false); }
  };

  const handleDelete = async () => {
    try { await serversApi.delete(id); toast.success('Server deleted'); router.push('/dashboard/servers'); }
    catch { toast.error('Failed to delete'); }
  };

  const handleRenew = async () => {
    setRenewLoading(true);
    try { await serversApi.renew(id); toast.success('Server renewed!'); fetchServer(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Renewal failed'); }
    finally { setRenewLoading(false); }
  };

  useEffect(() => {
    if (server) serversApi.renewalCost(id).then(r => setRenewalCost(r.data.cost ?? r.data.price ?? r.data)).catch(() => {});
  }, [server, id]);

  useEffect(() => {
    if (!server?.pteroUuid) {
      setPluginProfile(null);
      return;
    }
    pluginsApi.detect(server.pteroUuid)
      .then((r) => setPluginProfile(r.data))
      .catch(() => setPluginProfile(null));
  }, [server?.pteroUuid]);

  const tabs = useMemo(() => {
    const list = [...BASE_TABS];
    if (pluginProfile?.isMinecraft) {
      const pluginTab = { id: 'plugins', label: pluginProfile?.type === 'mod' ? 'Mods' : 'Plugins', icon: Puzzle };
      const playersTab = { id: 'players', label: 'Players', icon: Users };
      const insertBefore = list.findIndex((item) => item.id === 'activity');
      if (insertBefore >= 0) list.splice(insertBefore, 0, pluginTab, playersTab);
      else list.push(pluginTab, playersTab);
    }
    return list;
  }, [pluginProfile]);

  useEffect(() => {
    if ((tab === 'plugins' || tab === 'players') && !pluginProfile?.isMinecraft) {
      setTab('console');
    }
  }, [tab, pluginProfile]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 text-primary animate-spin" /></div>;
  if (!server) return null;

  const status = server.resources?.current_state || server.status?.toLowerCase() || 'offline';
  const sc = STATUS_CFG[status] || STATUS_CFG.offline;
  const isSuspended = server.status === 'SUSPENDED';
  const isExpired = server.status === 'EXPIRED';

  return (
    <div className="space-y-6">
      {/* Suspension/Expired Overlay */}
      {(isSuspended || isExpired) && (
        <div className="rounded-xl p-5" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <ShieldAlert className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="font-semibold text-red-400 text-sm">{isSuspended ? 'Server Suspended' : 'Server Expired'}</p>
              <p className="text-[12px] text-gray-500 mt-0.5">{isSuspended ? 'Contact support for assistance.' : 'Renew your server to continue using it.'}</p>
            </div>
            {isExpired && (
              <button onClick={handleRenew} disabled={renewLoading} className="btn-primary ml-auto text-sm">
                {renewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Renew${renewalCost !== null ? ` (₹${renewalCost})` : ''}`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Link href="/dashboard/servers" className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-white transition-colors shrink-0" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-display font-bold text-white truncate">{server.name}</h1>
            <div className="flex items-center gap-2 text-[12px] mt-0.5">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-medium" style={{ background: sc.bg, border: `1px solid ${sc.border}` }}>
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                <span className={sc.text}>{status}</span>
              </span>
              <span className="text-gray-500 flex items-center gap-1"><MemoryStick className="w-3 h-3" />{server.ram >= 1024 ? `${(server.ram/1024).toFixed(1)}G` : `${server.ram}M`}</span>
              <span className="text-gray-500 flex items-center gap-1"><Cpu className="w-3 h-3" />{server.cpu}%</span>
              <span className="text-gray-500 flex items-center gap-1"><HardDrive className="w-3 h-3" />{server.disk >= 1024 ? `${(server.disk/1024).toFixed(1)}G` : `${server.disk}M`}</span>
            </div>
          </div>
        </div>

        {/* Power Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {[
            { signal: 'start', icon: Play, color: 'text-emerald-400', bg: 'rgba(16,185,129,0.06)', hoverBg: 'rgba(16,185,129,0.12)', disabled: status === 'running' },
            { signal: 'stop', icon: Square, color: 'text-red-400', bg: 'rgba(239,68,68,0.06)', hoverBg: 'rgba(239,68,68,0.12)', disabled: status === 'offline' },
            { signal: 'restart', icon: RotateCcw, color: 'text-yellow-400', bg: 'rgba(234,179,8,0.06)', hoverBg: 'rgba(234,179,8,0.12)', disabled: status === 'offline' },
            { signal: 'kill', icon: Skull, color: 'text-red-500', bg: 'rgba(239,68,68,0.06)', hoverBg: 'rgba(239,68,68,0.12)', disabled: status === 'offline' },
          ].map(p => (
            <button key={p.signal} onClick={() => handlePower(p.signal)} disabled={powerLoading || p.disabled || isSuspended}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 ${p.color}`}
              style={{ background: p.bg }}
              title={p.signal}>
              <p.icon className="w-4 h-4" />
            </button>
          ))}
          <button onClick={() => setDeleteConfirm(true)} className="w-9 h-9 rounded-xl flex items-center justify-center text-red-400 transition-all" style={{ background: 'rgba(239,68,68,0.06)' }} title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition-all ${
              tab === t.id ? 'text-primary' : 'text-gray-500 hover:text-white hover:bg-white/[0.03]'
            }`}
            style={tab === t.id ? { background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)' } : undefined}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
          {tab === 'console' && <ConsoleTab serverId={id} />}
          {tab === 'files' && <FilesTab serverId={id} />}
          {tab === 'databases' && <DatabasesTab serverId={id} />}
          {tab === 'backups' && <BackupsTab serverId={id} />}
          {tab === 'network' && <NetworkTab serverId={id} />}
          {tab === 'startup' && <StartupTab serverId={id} />}
          {tab === 'schedules' && <SchedulesTab serverId={id} />}
          {tab === 'plugins' && pluginProfile?.isMinecraft && <PluginsTab serverUuid={server.pteroUuid} profile={pluginProfile} />}
          {tab === 'players' && <PlayersTab serverUuid={server.pteroUuid} />}
          {tab === 'activity' && <ActivityTab serverId={id} />}
          {tab === 'settings' && <SettingsTab serverId={id} serverName={server.name} onRenamed={fetchServer} />}
        </motion.div>
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="neo-card max-w-md w-full overflow-hidden">
              <div className="p-5" style={{ background: 'linear-gradient(180deg, rgba(239,68,68,0.06) 0%, transparent 100%)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 className="text-base font-semibold text-white flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-400" /> Delete Server</h3>
              </div>
              <div className="p-5">
                <p className="text-sm text-gray-400">This will permanently delete <strong className="text-white">{server.name}</strong> and all its data. This action cannot be undone.</p>
                <div className="flex gap-3 justify-end mt-5">
                  <button onClick={() => setDeleteConfirm(false)} className="btn-secondary text-sm">Cancel</button>
                  <button onClick={handleDelete} className="btn-danger text-sm">Delete Forever</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ──────── CONSOLE TAB ──────── */
function ConsoleTab({ serverId }: { serverId: string }) {
  const [lines, setLines] = useState<string[]>([]);
  const [cmd, setCmd] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [failed, setFailed] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const connectRef = useRef<() => Promise<void>>(async () => {});
  const reconnectTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(false);
  const retriesRef = useRef(0);
  const MAX_RETRIES = 8;

  const appendLines = useCallback((input: string | string[]) => {
    const next = (Array.isArray(input) ? input : [input])
      .map((line) => stripAnsi(String(line ?? '')))
      .filter((line) => line.length > 0);
    if (!next.length) return;
    setLines((prev) => [...prev, ...next].slice(-500));
  }, []);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const reconnect = useCallback((delay = 1500) => {
    if (!mountedRef.current) return;
    if (retriesRef.current >= MAX_RETRIES) {
      setConnecting(false);
      setFailed(true);
      appendLines('[system] Max reconnection attempts reached. Click reconnect to try again.');
      return;
    }
    retriesRef.current += 1;
    // Exponential backoff: 1.5s, 3s, 6s, 12s… capped at 30s
    const backoff = Math.min(delay * Math.pow(2, retriesRef.current - 1), 30000);
    clearReconnectTimer();
    reconnectTimerRef.current = window.setTimeout(() => {
      if (!mountedRef.current) return;
      void connectRef.current();
    }, backoff);
  }, [appendLines, clearReconnectTimer]);

  const connect = useCallback(async () => {
    try {
      clearReconnectTimer();
      setConnecting(true);
      setConnected(false);
      setFailed(false);

      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
        wsRef.current = null;
      }

      let res;
      try {
        res = await serversApi.console(serverId);
      } catch (apiErr: any) {
        const status = apiErr?.response?.status;
        const msg = apiErr?.response?.data?.message || apiErr?.message || 'unknown';
        if (status === 404) {
          appendLines('[system] Server not found. It may not be linked to the panel yet.');
          setConnecting(false);
          setFailed(true);
          return;
        }
        if (status === 401 || status === 403) {
          appendLines('[system] Authentication error. Please log in again.');
          setConnecting(false);
          setFailed(true);
          return;
        }
        if (status === 409) {
          appendLines('[system] Server is suspended or installing. Console is unavailable until the server is active.');
          setConnecting(false);
          setFailed(true);
          return;
        }
        if (status === 502 || status === 503) {
          appendLines('[system] Panel is unreachable. Check your Pterodactyl configuration.');
          setConnecting(false);
          setFailed(true);
          return;
        }
        throw new Error(msg);
      }

      const socket = res.data?.socket;
      const token = res.data?.token;
      if (!socket || !token) {
        appendLines('[system] Failed to get console credentials. Is the server linked to the panel?');
        setConnecting(false);
        setFailed(true);
        return;
      }

      const ws = new WebSocket(socket);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ event: 'auth', args: [token] }));
      };

      ws.onmessage = (message) => {
        if (typeof message.data !== 'string') return;
        try {
          const payload = JSON.parse(message.data);
          const event = payload?.event;
          const args = Array.isArray(payload?.args) ? payload.args : [];

          if (event === 'auth success') {
            retriesRef.current = 0;
            setConnected(true);
            setConnecting(false);
            setFailed(false);
            ws.send(JSON.stringify({ event: 'send logs', args: [null] }));
            ws.send(JSON.stringify({ event: 'send stats', args: [null] }));
            return;
          }

          if (event === 'console output') {
            const chunk = typeof args[0] === 'string' ? args[0] : '';
            appendLines(chunk.split('\n'));
            return;
          }

          if (event === 'daemon message' && typeof args[0] === 'string') {
            appendLines(`[daemon] ${args[0]}`);
            return;
          }

          if (event === 'token expiring') {
            serversApi.console(serverId).then((r) => {
              const newToken = r.data?.token;
              if (newToken && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ event: 'auth', args: [newToken] }));
              }
            }).catch(() => {
              appendLines('[system] Token refresh failed, reconnecting...');
              ws.close();
            });
            return;
          }

          if (event === 'token expired' || event === 'jwt error' || event === 'auth error') {
            appendLines(`[system] ${event} — reconnecting...`);
            ws.close();
          }

          if (event === 'status') {
            const status = typeof args[0] === 'string' ? args[0] : '';
            if (status) appendLines(`[system] Server status: ${status}`);
            return;
          }
        } catch {
          appendLines(message.data);
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        setConnecting(true);
        reconnect(1500);
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        setConnecting(true);
        reconnect(3000);
      };
    } catch (e: any) {
      if (!mountedRef.current) return;
      setConnected(false);
      setConnecting(true);
      appendLines(`[system] Connection error: ${e?.message || 'unknown'}`);
      reconnect(3000);
    }
  }, [appendLines, clearReconnectTimer, reconnect, serverId]);
  connectRef.current = connect;

  const manualReconnect = useCallback(() => {
    retriesRef.current = 0;
    setFailed(false);
    void connectRef.current();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void connect();
    return () => {
      mountedRef.current = false;
      clearReconnectTimer();
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [clearReconnectTimer, connect]);

  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' }); }, [lines]);

  const sendCmd = async () => {
    const value = cmd.trim();
    if (!value) return;
    setSending(true);
    try {
      await serversApi.command(serverId, value);
      appendLines(`> ${value}`);
      setHistory(p => [value, ...p.slice(0, 49)]);
      setCmd('');
      setHistIdx(-1);
    }
    catch { toast.error('Failed to send command'); }
    finally { setSending(false); }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') sendCmd();
    if (e.key === 'ArrowUp' && history.length) { const i = Math.min(histIdx + 1, history.length - 1); setHistIdx(i); setCmd(history[i]); }
    if (e.key === 'ArrowDown') { const i = histIdx - 1; if (i < 0) { setHistIdx(-1); setCmd(''); } else { setHistIdx(i); setCmd(history[i]); } }
  };

  return (
    <div className="neo-card overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : failed ? 'bg-red-400' : connecting ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'}`} />
          <span className="text-gray-400">{connected ? 'Live console connected' : failed ? 'Connection failed' : connecting ? 'Connecting console...' : 'Console disconnected'}</span>
        </div>
        <button
          onClick={manualReconnect}
          className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white"
          title="Reconnect"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>
      </div>
      <div ref={logRef} className="h-[400px] sm:h-[500px] overflow-y-auto p-4 font-mono text-xs sm:text-sm text-gray-300 space-y-0.5 bg-[#0d1117]">
        {lines.length === 0 && <p className="text-gray-600 italic">No console output...</p>}
        {lines.map((l, i) => <div key={i} className="whitespace-pre-wrap break-all leading-5">{l}</div>)}
      </div>
      <div className="flex items-center border-t border-white/5 bg-white/[0.02]">
        <span className="pl-4 text-primary font-mono text-sm">{'>'}</span>
        <input type="text" value={cmd} onChange={e => setCmd(e.target.value)} onKeyDown={handleKey}
          placeholder="Type a command..." className="flex-1 bg-transparent px-3 py-3 text-sm text-white outline-none font-mono" />
        <button onClick={sendCmd} disabled={sending || !cmd.trim()} className="px-4 py-3 text-primary hover:bg-white/5 disabled:opacity-30 transition-colors">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ──────── FILES TAB ──────── */
function FilesTab({ serverId }: { serverId: string }) {
  const [dir, setDir] = useState('/');
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ name: string; content: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [newFolder, setNewFolder] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [renaming, setRenaming] = useState<any>(null);
  const [newName, setNewName] = useState('');

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try { const res = await serversApi.listFiles(serverId, dir); setFiles(res.data?.data || res.data || []); }
    catch { toast.error('Failed to load files'); }
    finally { setLoading(false); }
  }, [serverId, dir]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const openFile = async (name: string) => {
    try {
      const path = dir === '/' ? `/${name}` : `${dir}/${name}`;
      const res = await serversApi.readFile(serverId, path);
      setEditing({ name: path, content: typeof res.data === 'string' ? res.data : res.data?.content || JSON.stringify(res.data) });
    } catch { toast.error('Cannot open file'); }
  };

  const saveFile = async () => {
    if (!editing) return;
    setSaving(true);
    try { await serversApi.writeFile(serverId, editing.name, editing.content); toast.success('Saved!'); setEditing(null); }
    catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const deleteFile = async (name: string, isDir: boolean) => {
    if (!confirm(`Delete ${isDir ? 'folder' : 'file'} "${name}"?`)) return;
    try { await serversApi.deleteFiles(serverId, dir, [name]); toast.success('Deleted'); fetchFiles(); }
    catch { toast.error('Delete failed'); }
  };

  const createFolder = async () => {
    if (!newFolder.trim()) return;
    try { await serversApi.createFolder(serverId, dir, newFolder); toast.success('Created'); setNewFolder(''); setShowNewFolder(false); fetchFiles(); }
    catch { toast.error('Failed'); }
  };

  const handleRename = async () => {
    if (!renaming || !newName.trim()) return;
    try { await serversApi.renameFile(serverId, dir, renaming.name, newName); toast.success('Renamed'); setRenaming(null); setNewName(''); fetchFiles(); }
    catch { toast.error('Rename failed'); }
  };

  const navigate = (name: string) => setDir(dir === '/' ? `/${name}` : `${dir}/${name}`);
  const goUp = () => { const parts = dir.split('/').filter(Boolean); parts.pop(); setDir('/' + parts.join('/')); };

  if (editing) {
    return (
      <div className="neo-card overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-white/5">
          <span className="text-sm text-gray-300 font-mono truncate">{editing.name}</span>
          <div className="flex gap-2">
            <button onClick={() => setEditing(null)} className="btn-secondary text-xs">Cancel</button>
            <button onClick={saveFile} disabled={saving} className="btn-primary text-xs">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
        <textarea value={editing.content} onChange={e => setEditing({ ...editing, content: e.target.value })}
          className="w-full h-[500px] bg-[#0d1117] p-4 font-mono text-sm text-gray-300 outline-none resize-none" spellCheck={false} />
      </div>
    );
  }

  return (
    <div className="neo-card overflow-hidden">
      <div className="flex items-center gap-2 p-3 border-b border-white/5 flex-wrap">
        <button onClick={goUp} disabled={dir === '/'} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-mono text-gray-400 truncate flex-1">{dir}</span>
        <button onClick={() => setShowNewFolder(!showNewFolder)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white">
          <Plus className="w-4 h-4" />
        </button>
        <button onClick={fetchFiles} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {showNewFolder && (
        <div className="flex items-center gap-2 p-3 border-b border-white/5 bg-white/[0.02]">
          <input type="text" value={newFolder} onChange={e => setNewFolder(e.target.value)} placeholder="Folder name"
            className="input-field text-sm flex-1" onKeyDown={e => e.key === 'Enter' && createFolder()} />
          <button onClick={createFolder} className="btn-primary text-xs">Create</button>
        </div>
      )}

      {loading ? (
        <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      ) : files.length === 0 ? (
        <div className="p-8 text-center text-gray-500 text-sm">Empty directory</div>
      ) : (
        <div className="divide-y divide-white/5">
          {[...files].sort((a, b) => (b.is_file === false ? 1 : 0) - (a.is_file === false ? 1 : 0) || a.name.localeCompare(b.name)).map((f: any) => (
            <div key={f.name} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] group">
              {f.is_file === false || f.mime === 'inode/directory' ? (
                <button onClick={() => navigate(f.name)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <Folder className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm text-gray-200 truncate">{f.name}</span>
                </button>
              ) : (
                <button onClick={() => openFile(f.name)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <File className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-300 truncate">{f.name}</span>
                  <span className="text-xs text-gray-600 ml-auto">{f.size ? (f.size > 1048576 ? `${(f.size/1048576).toFixed(1)}M` : `${(f.size/1024).toFixed(0)}K`) : ''}</span>
                </button>
              )}
              <div className="hidden group-hover:flex items-center gap-1">
                {(f.is_file !== false && f.mime !== 'inode/directory') && (
                  <button onClick={async () => {
                    try {
                      const path = dir === '/' ? `/${f.name}` : `${dir}/${f.name}`;
                      const r = await serversApi.downloadFile(serverId, path);
                      const url = r.data?.url;
                      if (url) window.open(url, '_blank');
                      else toast.error('No download URL');
                    } catch { toast.error('Download failed'); }
                  }} className="w-7 h-7 rounded flex items-center justify-center text-gray-500 hover:text-primary" title="Download">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                )}
                {(f.name.endsWith('.tar.gz') || f.name.endsWith('.zip') || f.name.endsWith('.gz') || f.name.endsWith('.rar')) && (
                  <button onClick={async () => {
                    try { await serversApi.decompressFile(serverId, dir, f.name); toast.success('Decompressing...'); setTimeout(fetchFiles, 3000); }
                    catch { toast.error('Decompress failed'); }
                  }} className="w-7 h-7 rounded flex items-center justify-center text-gray-500 hover:text-yellow-400" title="Decompress">
                    <FileArchive className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={() => { setRenaming(f); setNewName(f.name); }} className="w-7 h-7 rounded flex items-center justify-center text-gray-500 hover:text-white">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => deleteFile(f.name, f.is_file === false)} className="w-7 h-7 rounded flex items-center justify-center text-gray-500 hover:text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rename modal */}
      <AnimatePresence>
        {renaming && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="neo-card p-6 max-w-sm w-full space-y-4">
              <h3 className="text-lg font-semibold text-white">Rename</h3>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="input-field" onKeyDown={e => e.key === 'Enter' && handleRename()} />
              <div className="flex gap-3 justify-end">
                <button onClick={() => setRenaming(null)} className="btn-secondary text-sm">Cancel</button>
                <button onClick={handleRename} className="btn-primary text-sm">Rename</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ──────── DATABASES TAB ──────── */
function DatabasesTab({ serverId }: { serverId: string }) {
  const [dbs, setDbs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showPass, setShowPass] = useState<Record<string, boolean>>({});

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const r = await serversApi.databases(serverId); setDbs(r.data?.data || r.data || []); }
    catch { toast.error('Failed to load databases'); }
    finally { setLoading(false); }
  }, [serverId]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try { await serversApi.createDb(serverId, name); toast.success('Database created'); setName(''); fetch(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
    finally { setCreating(false); }
  };

  const remove = async (dbId: string) => {
    if (!confirm('Delete this database?')) return;
    try { await serversApi.deleteDb(serverId, dbId); toast.success('Deleted'); fetch(); }
    catch { toast.error('Failed'); }
  };

  const rotatePassword = async (dbId: string) => {
    if (!confirm('Rotate this database password? The old password will stop working immediately.')) return;
    try { await serversApi.rotateDatabasePassword(serverId, dbId); toast.success('Password rotated'); fetch(); }
    catch { toast.error('Failed to rotate password'); }
  };

  return (
    <div className="space-y-4">
      <div className="neo-card p-4 flex gap-3">
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Database name" className="input-field flex-1 text-sm" onKeyDown={e => e.key === 'Enter' && create()} />
        <button onClick={create} disabled={creating} className="btn-primary text-sm">{creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}</button>
      </div>
      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div> :
        dbs.length === 0 ? <div className="neo-card p-8 text-center text-gray-500 text-sm">No databases</div> :
        <div className="grid gap-3">
          {dbs.map((db: any) => (
            <div key={db.id} className="neo-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Database className="w-4 h-4 text-primary" /><span className="font-medium text-white text-sm">{db.name || db.database}</span></div>
                <div className="flex items-center gap-2">
                  <button onClick={() => rotatePassword(db.id)} className="text-gray-500 hover:text-yellow-400 transition-colors" title="Rotate password"><RotateCw className="w-4 h-4" /></button>
                  <button onClick={() => remove(db.id)} className="text-gray-500 hover:text-red-400 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              {db.host && <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-500">Host:</span> <span className="text-gray-300">{db.host}:{db.port}</span></div>
                <div><span className="text-gray-500">User:</span> <span className="text-gray-300">{db.username}</span></div>
                {db.password && <div className="col-span-2 flex items-center gap-2">
                  <span className="text-gray-500">Pass:</span>
                  <span className="text-gray-300 font-mono">{showPass[db.id] ? db.password : '••••••••'}</span>
                  <button onClick={() => setShowPass(p => ({ ...p, [db.id]: !p[db.id] }))} className="text-gray-500 hover:text-white">{showPass[db.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}</button>
                  <button onClick={() => { navigator.clipboard.writeText(db.password); toast.success('Copied!'); }} className="text-gray-500 hover:text-white"><Copy className="w-3 h-3" /></button>
                </div>}
              </div>}
            </div>
          ))}
        </div>}
    </div>
  );
}

/* ──────── BACKUPS TAB ──────── */
function BackupsTab({ serverId }: { serverId: string }) {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const r = await serversApi.backups(serverId); setBackups(r.data?.data || r.data || []); }
    catch { toast.error('Failed'); }
    finally { setLoading(false); }
  }, [serverId]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async () => {
    setCreating(true);
    try { await serversApi.createBackup(serverId); toast.success('Backup started'); setTimeout(fetch, 3000); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
    finally { setCreating(false); }
  };

  const download = async (backupId: string) => {
    try {
      const r = await serversApi.downloadBackup(serverId, backupId);
      const url = r.data?.url || r.data;
      if (url && typeof url === 'string') window.open(url, '_blank');
      else toast.error('No download URL');
    } catch { toast.error('Download failed'); }
  };

  const remove = async (backupId: string) => {
    if (!confirm('Delete this backup?')) return;
    try { await serversApi.deleteBackup(serverId, backupId); toast.success('Deleted'); fetch(); }
    catch { toast.error('Failed'); }
  };

  const restore = async (backupId: string) => {
    if (!confirm('Restore this backup? This will overwrite current server files.')) return;
    try { await serversApi.restoreBackup(serverId, backupId); toast.success('Restore started'); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Restore failed'); }
  };

  const toggleLock = async (backupId: string) => {
    try { await serversApi.toggleBackupLock(serverId, backupId); toast.success('Lock toggled'); fetch(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={create} disabled={creating} className="btn-primary text-sm flex items-center gap-2">
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create Backup
        </button>
      </div>
      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div> :
        backups.length === 0 ? <div className="neo-card p-8 text-center text-gray-500 text-sm">No backups</div> :
        <div className="grid gap-3">
          {backups.map((b: any) => (
            <div key={b.uuid || b.id} className="neo-card p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-white text-sm">{b.name || 'Backup'}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {b.bytes ? (b.bytes > 1048576 ? `${(b.bytes/1048576).toFixed(1)} MB` : `${(b.bytes/1024).toFixed(0)} KB`) : ''}
                  {b.created_at && ` · ${new Date(b.created_at).toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {b.is_successful !== false && (
                  <>
                    <button onClick={() => restore(b.uuid || b.id)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-emerald-400" title="Restore"><RotateCw className="w-4 h-4" /></button>
                    <button onClick={() => download(b.uuid || b.id)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-primary" title="Download"><Download className="w-4 h-4" /></button>
                  </>
                )}
                <button onClick={() => toggleLock(b.uuid || b.id)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-yellow-400" title={b.is_locked ? 'Unlock' : 'Lock'}>
                  {b.is_locked ? <Lock className="w-4 h-4 text-yellow-400" /> : <Unlock className="w-4 h-4" />}
                </button>
                <button onClick={() => remove(b.uuid || b.id)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-red-400" title="Delete"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>}
    </div>
  );
}

/* ──────── NETWORK TAB ──────── */
function NetworkTab({ serverId }: { serverId: string }) {
  const [network, setNetwork] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    serversApi.network(serverId).then(r => setNetwork(r.data)).catch(() => toast.error('Failed'))
      .finally(() => setLoading(false));
  }, [serverId]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;

  const allocs = network?.data || network?.allocations || (Array.isArray(network) ? network : [network].filter(Boolean));

  return (
    <div className="grid gap-3">
      {allocs.length === 0 ? <div className="neo-card p-8 text-center text-gray-500 text-sm">No allocations</div> :
        allocs.map((a: any, i: number) => (
          <div key={i} className="neo-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-primary" />
              <div>
                <p className="font-mono text-white text-sm">{a.ip || a.alias || '0.0.0.0'}:{a.port}</p>
                {a.is_default && <span className="text-xs text-primary">Primary</span>}
              </div>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(`${a.ip || a.alias}:${a.port}`); toast.success('Copied!'); }}
              className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        ))}
    </div>
  );
}

/* ──────── STARTUP TAB ──────── */
function StartupTab({ serverId }: { serverId: string }) {
  const [vars, setVars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    serversApi.startup(serverId).then(r => {
      const data = r.data?.data || r.data || [];
      setVars(data);
      const v: Record<string, string> = {};
      data.forEach((vr: any) => { v[vr.env_variable] = vr.server_value ?? vr.default_value ?? ''; });
      setValues(v);
    }).catch(() => toast.error('Failed')).finally(() => setLoading(false));
  }, [serverId]);

  const save = async (key: string) => {
    setSaving(key);
    try { await serversApi.updateStartup(serverId, key, values[key]); toast.success('Updated'); }
    catch { toast.error('Failed'); }
    finally { setSaving(null); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;

  return (
    <div className="grid gap-3">
      {vars.length === 0 ? <div className="neo-card p-8 text-center text-gray-500 text-sm">No startup variables</div> :
        vars.map((v: any) => (
          <div key={v.env_variable} className="neo-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white">{v.name}</label>
              <span className="text-xs text-gray-600 font-mono">{v.env_variable}</span>
            </div>
            {v.description && <p className="text-xs text-gray-500">{v.description}</p>}
            <div className="flex gap-2">
              <input type="text" value={values[v.env_variable] || ''} onChange={e => setValues(p => ({ ...p, [v.env_variable]: e.target.value }))}
                className="input-field text-sm flex-1 font-mono" placeholder={v.default_value} />
              <button onClick={() => save(v.env_variable)} disabled={saving === v.env_variable} className="btn-primary text-xs px-3">
                {saving === v.env_variable ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}

/* ──────── PLUGINS TAB ──────── */
function PluginsTab({ serverUuid, profile }: { serverUuid: string; profile: any }) {
  const projectType = profile?.type === 'mod' ? 'mod' : 'plugin';
  const noun = projectType === 'mod' ? 'Mods' : 'Plugins';
  const spigotAllowed = profile?.allowedSources?.includes('spiget');

  // View & source state
  const [activeView, setActiveView] = useState<'browse' | 'installed'>('browse');
  const [source, setSource] = useState<'modrinth' | 'spigot'>('modrinth');

  // Browse sub-mode: 'search' | 'trending' | 'updated' | 'new' | 'downloads'
  const [browseMode, setBrowseMode] = useState<string>('trending');

  // Search & browse state
  const [searchQ, setSearchQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [totalHits, setTotalHits] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 20;

  // Modrinth sort mapping
  const modrinthSortMap: Record<string, string> = {
    trending: 'relevance',
    downloads: 'downloads',
    updated: 'updated',
    new: 'newest',
    follows: 'follows',
  };

  // SpigotMC sort mapping
  const spigetSortMap: Record<string, string> = {
    trending: '-downloads',
    downloads: '-downloads',
    updated: '-updateDate',
    new: '-releaseDate',
    rating: '-rating.average',
  };

  // Filters
  const [selectedLoader, setSelectedLoader] = useState<string>('');
  const [selectedGameVersion, setSelectedGameVersion] = useState<string>(profile?.minecraftVersion || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Tags from APIs
  const [modrinthTags, setModrinthTags] = useState<{ categories: any[]; loaders: any[]; gameVersions: any[] } | null>(null);
  const [spigetCategories, setSpigetCategories] = useState<any[]>([]);

  // Installed & updates
  const [installed, setInstalled] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [loadingInstalled, setLoadingInstalled] = useState(true);

  // Version picker modal (Modrinth)
  const [versionPicker, setVersionPicker] = useState<{ projectId: string; projectTitle: string; versions: any[]; iconUrl?: string; source: 'modrinth' | 'spigot' } | null>(null);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Action states
  const [installing, setInstalling] = useState<string | null>(null);
  const [updatingFile, setUpdatingFile] = useState<string | null>(null);
  const [updatingAll, setUpdatingAll] = useState(false);

  // Computed values
  const updatesByFile = useMemo(() => {
    const map = new Map<string, any>();
    updates.forEach((u: any) => { const key = String(u.fileName || ''); if (key) map.set(key, u); });
    return map;
  }, [updates]);

  const installedProjectIds = useMemo(
    () => new Set(installed.map((i: any) => i.projectId).filter(Boolean).map(String)),
    [installed],
  );
  const installedResourceIds = useMemo(
    () => new Set(installed.map((i: any) => i.resourceId).filter((v: any) => v != null).map(String)),
    [installed],
  );

  // Filtered Modrinth tags based on projectType
  const filteredCategories = useMemo(() => {
    if (!modrinthTags?.categories) return [];
    return modrinthTags.categories.filter((c: any) => c.project_type === projectType && c.header === 'categories');
  }, [modrinthTags, projectType]);

  const filteredLoaders = useMemo(() => {
    if (!modrinthTags?.loaders) return [];
    return modrinthTags.loaders.filter((l: any) => l.supported_project_types?.includes(projectType));
  }, [modrinthTags, projectType]);

  const filteredGameVersions = useMemo(() => {
    if (!modrinthTags?.gameVersions) return [];
    return modrinthTags.gameVersions.filter((v: any) => v.version_type === 'release');
  }, [modrinthTags]);

  // ---------- Data loading ----------
  const refreshInstalled = useCallback(async () => {
    const [inst, upd] = await Promise.all([
      pluginsApi.installed(serverUuid).catch(() => ({ data: [] })),
      pluginsApi.checkUpdates(serverUuid).catch(() => ({ data: [] })),
    ]);
    setInstalled(Array.isArray(inst.data) ? inst.data : (inst.data?.data || []));
    setUpdates(Array.isArray(upd.data) ? upd.data : (upd.data?.data || []));
  }, [serverUuid]);

  useEffect(() => {
    setLoadingInstalled(true);
    refreshInstalled().finally(() => setLoadingInstalled(false));
  }, [refreshInstalled]);

  useEffect(() => {
    if (profile?.minecraftVersion) setSelectedGameVersion(profile.minecraftVersion);
  }, [profile?.minecraftVersion]);

  // Load tags when source changes
  useEffect(() => {
    if (source === 'modrinth' && !modrinthTags) {
      pluginsApi.modrinthTags()
        .then((r) => setModrinthTags(r.data || { categories: [], loaders: [], gameVersions: [] }))
        .catch(() => setModrinthTags({ categories: [], loaders: [], gameVersions: [] }));
    }
    if (source === 'spigot' && spigetCategories.length === 0) {
      pluginsApi.spigetCategories()
        .then((r) => setSpigetCategories(Array.isArray(r.data) ? r.data : []))
        .catch(() => setSpigetCategories([]));
    }
  }, [source, modrinthTags, spigetCategories.length]);

  // Reset page & category on source change
  useEffect(() => {
    setSelectedCategory('');
    setCurrentPage(0);
    setResults([]);
  }, [source]);

  // ---------- Search ----------
  const search = useCallback(async (page = 0) => {
    setSearching(true);
    try {
      if (source === 'modrinth') {
        const query = searchQ.trim() || '';
        const loaders = selectedLoader ? [selectedLoader] : (profile?.loaders?.length ? profile.loaders : undefined);
        const gameVersions = selectedGameVersion ? [selectedGameVersion] : (profile?.minecraftVersion ? [profile.minecraftVersion] : undefined);
        const categories = selectedCategory ? [selectedCategory] : undefined;
        const isSearchMode = searchQ.trim().length > 0;
        const sortIndex = isSearchMode ? 'relevance' : (modrinthSortMap[browseMode] || 'downloads');

        const r = await pluginsApi.modrinthSearch(query, {
          limit: ITEMS_PER_PAGE,
          offset: page * ITEMS_PER_PAGE,
          projectType,
          loaders,
          categories,
          gameVersions,
          index: sortIndex,
        });
        const data = r.data || {};
        setResults(Array.isArray(data.hits) ? data.hits : []);
        setTotalHits(data.total_hits || 0);
      } else {
        // SpigotMC
        const categoryId = selectedCategory ? Number(selectedCategory) : undefined;
        const q = searchQ.trim();
        let items: any[];
        const isSearchMode = q.length > 0;

        if (isSearchMode) {
          const sort = spigetSortMap[browseMode] || '-downloads';
          const r = await pluginsApi.spigetSearch(q, page + 1, categoryId, ITEMS_PER_PAGE, sort);
          items = Array.isArray(r.data) ? r.data : [];
        } else if (browseMode === 'new') {
          const r = await pluginsApi.spigetNew(page + 1, ITEMS_PER_PAGE);
          items = Array.isArray(r.data) ? r.data : [];
        } else if (browseMode === 'updated') {
          const r = await pluginsApi.spigetUpdated(page + 1, ITEMS_PER_PAGE);
          items = Array.isArray(r.data) ? r.data : [];
        } else {
          // trending / downloads = popular
          const r = await pluginsApi.spigetPopular(page + 1, ITEMS_PER_PAGE);
          items = Array.isArray(r.data) ? r.data : [];
        }
        setResults(items);
        setTotalHits(items.length >= ITEMS_PER_PAGE ? (page + 2) * ITEMS_PER_PAGE : (page * ITEMS_PER_PAGE) + items.length);
      }
      setCurrentPage(page);
    } catch {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  }, [source, searchQ, selectedLoader, selectedGameVersion, selectedCategory, browseMode, profile, projectType]);

  // Auto-search on filter/sort/browseMode change
  useEffect(() => {
    search(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, selectedCategory, selectedLoader, selectedGameVersion, browseMode]);

  // ---------- Version picker (Modrinth) ----------
  const openModrinthVersionPicker = async (item: any) => {
    const projectId = String(item.project_id || item.slug || '');
    if (!projectId) { toast.error('Invalid project'); return; }
    setLoadingVersions(true);
    try {
      const loaders = selectedLoader ? [selectedLoader] : (profile?.loaders || undefined);
      const gameVersions = selectedGameVersion ? [selectedGameVersion] : (profile?.minecraftVersion ? [profile.minecraftVersion] : undefined);
      const r = await pluginsApi.modrinthVersions(projectId, loaders, gameVersions);
      const versions = Array.isArray(r.data) ? r.data : [];
      if (versions.length === 0) {
        toast.error(`No compatible versions found for ${profile?.minecraftVersion || 'this server'}`);
        return;
      }
      setVersionPicker({
        projectId,
        projectTitle: item.title || item.name || projectId,
        versions,
        iconUrl: item.icon_url,
        source: 'modrinth',
      });
    } catch {
      toast.error('Failed to load versions');
    } finally {
      setLoadingVersions(false);
    }
  };

  // ---------- Version picker (Spiget) ----------
  const openSpigetVersionPicker = async (item: any) => {
    const resourceId = Number(item.id);
    if (!resourceId) { toast.error('Invalid resource'); return; }
    setLoadingVersions(true);
    try {
      const r = await pluginsApi.spigetVersions(resourceId);
      const versions = Array.isArray(r.data) ? r.data : [];
      if (versions.length === 0) {
        // Fallback: install latest directly
        installSpiget(item);
        return;
      }
      const iconUrl = item.icon?.data ? `data:image/jpeg;base64,${item.icon.data}` : (item.icon?.url ? `https://api.spiget.org/v2/${item.icon.url}` : undefined);
      setVersionPicker({
        projectId: String(resourceId),
        projectTitle: item.name || `Resource #${resourceId}`,
        versions: versions.map((v: any) => ({
          ...v,
          _resourceId: resourceId,
          _resourceName: item.name,
        })),
        iconUrl,
        source: 'spigot',
      });
    } catch {
      toast.error('Failed to load versions');
    } finally {
      setLoadingVersions(false);
    }
  };

  const installModrinthVersion = async (projectId: string, versionId: string, versionName: string) => {
    setInstalling(versionId);
    try {
      await pluginsApi.modrinthInstall(serverUuid, projectId, versionId);
      toast.success(`Installed ${versionName || 'plugin'}`);
      setVersionPicker(null);
      await refreshInstalled();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Install failed');
    } finally {
      setInstalling(null);
    }
  };

  const installSpigetVersion = async (resourceId: number, versionId: number, versionName: string) => {
    setInstalling(String(versionId));
    try {
      await pluginsApi.spigetInstallVersion(serverUuid, resourceId, versionId);
      toast.success(`Installed version ${versionName || versionId}`);
      setVersionPicker(null);
      await refreshInstalled();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Install failed');
    } finally {
      setInstalling(null);
    }
  };

  // ---------- Quick install (SpigotMC - always latest) ----------
  const installSpiget = async (item: any) => {
    const key = String(item.id);
    setInstalling(key);
    try {
      await pluginsApi.spigetInstall(serverUuid, Number(item.id));
      toast.success(`${item.name || 'Plugin'} installed`);
      await refreshInstalled();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Install failed');
    } finally {
      setInstalling(null);
    }
  };

  // ---------- Remove ----------
  const remove = async (fileName: string) => {
    if (!confirm(`Remove ${fileName}?`)) return;
    try {
      await pluginsApi.remove(serverUuid, fileName);
      toast.success('Removed');
      await refreshInstalled();
    } catch { toast.error('Failed to remove'); }
  };

  // ---------- Updates ----------
  const updateOne = async (fileName: string) => {
    setUpdatingFile(fileName);
    try {
      await pluginsApi.updateOne(serverUuid, fileName);
      toast.success('Updated');
      await refreshInstalled();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Update failed'); }
    finally { setUpdatingFile(null); }
  };

  const updateAll = async () => {
    setUpdatingAll(true);
    try {
      const r = await pluginsApi.updateAll(serverUuid);
      const updated = r?.data?.updated ?? 0;
      const failed = r?.data?.failed ?? 0;
      if (updated > 0) toast.success(`Updated ${updated} ${noun.toLowerCase()}`);
      if (updated === 0 && failed === 0) toast('Everything is up to date');
      if (failed > 0) toast.error(`${failed} updates failed`);
      await refreshInstalled();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Update failed'); }
    finally { setUpdatingAll(false); }
  };

  // ---------- Helpers ----------
  const isInstalledResult = (item: any): boolean => {
    if (source === 'modrinth') {
      const pid = String(item.project_id || item.slug || '');
      return !!pid && installedProjectIds.has(pid);
    }
    return !!item.id && installedResourceIds.has(String(item.id));
  };

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  };

  const formatDate = (d: string | number) => {
    const date = typeof d === 'number' ? new Date(d * 1000) : new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatRelativeDate = (d: string | number) => {
    const date = typeof d === 'number' ? new Date(d * 1000) : new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  };

  const totalPages = Math.ceil(totalHits / ITEMS_PER_PAGE);
  const hasUpdates = updates.length > 0;

  if (!profile?.isMinecraft) {
    return <div className="neo-card p-8 text-center text-gray-500 text-sm">{noun} management is only available for Minecraft servers.</div>;
  }

  // Browse mode labels for each source
  const modrinthBrowseModes = [
    { id: 'trending', label: 'Trending', icon: '🔥' },
    { id: 'downloads', label: 'Most Downloaded', icon: '📥' },
    { id: 'updated', label: 'Recently Updated', icon: '🔄' },
    { id: 'new', label: 'Newest', icon: '✨' },
    { id: 'follows', label: 'Most Followed', icon: '❤️' },
  ];

  const spigetBrowseModes = [
    { id: 'trending', label: 'Popular', icon: '🔥' },
    { id: 'downloads', label: 'Most Downloaded', icon: '📥' },
    { id: 'updated', label: 'Recently Updated', icon: '🔄' },
    { id: 'new', label: 'Newest', icon: '✨' },
    { id: 'rating', label: 'Top Rated', icon: '⭐' },
  ];

  const activeBrowseModes = source === 'modrinth' ? modrinthBrowseModes : spigetBrowseModes;

  return (
    <div className="space-y-4">
      {/* ===== Header Card ===== */}
      <div className="neo-card overflow-hidden">
        <div className="p-4 flex items-center justify-between gap-3" style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.04) 0%, rgba(27,217,106,0.04) 100%)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: projectType === 'mod' ? 'rgba(168,85,247,0.1)' : 'rgba(0,212,255,0.1)', border: `1px solid ${projectType === 'mod' ? 'rgba(168,85,247,0.2)' : 'rgba(0,212,255,0.2)'}` }}>
              <Puzzle className={`w-5 h-5 ${projectType === 'mod' ? 'text-purple-400' : 'text-primary'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-white font-bold">{noun} Manager</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{
                  background: projectType === 'mod' ? 'rgba(168,85,247,0.12)' : 'rgba(0,212,255,0.12)',
                  color: projectType === 'mod' ? '#a855f7' : '#00d4ff',
                  border: `1px solid ${projectType === 'mod' ? 'rgba(168,85,247,0.25)' : 'rgba(0,212,255,0.25)'}`,
                }}>{projectType === 'mod' ? 'Mods Server' : 'Plugins Server'}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-gray-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {profile?.software || 'Unknown'}
                </span>
                {profile?.minecraftVersion && (
                  <span className="text-[11px] text-gray-500">MC {profile.minecraftVersion}</span>
                )}
                {profile?.loaders?.[0] && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400">{profile.loaders[0]}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasUpdates && (
              <button onClick={updateAll} disabled={updatingAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all text-yellow-400 hover:bg-yellow-500/10"
                style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}>
                {updatingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Update All ({updates.length})
              </button>
            )}
            <button onClick={() => refreshInstalled()} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors" title="Refresh">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ===== View Tabs: Browse / Installed ===== */}
      <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
        {(['browse', 'installed'] as const).map(v => (
          <button key={v} onClick={() => setActiveView(v)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${activeView === v ? 'text-white' : 'text-gray-500 hover:text-white'}`}
            style={activeView === v ? { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' } : undefined}>
            {v === 'browse' ? (
              <><Search className="w-3.5 h-3.5" /> Browse {noun}</>
            ) : (
              <>
                <Puzzle className="w-3.5 h-3.5" /> Installed ({installed.length})
                {hasUpdates && (
                  <span className="px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 text-[10px] font-bold">{updates.length}</span>
                )}
              </>
            )}
          </button>
        ))}
      </div>

      {/* ======== BROWSE VIEW ======== */}
      {activeView === 'browse' && (
        <div className="space-y-3">
          {/* Source selector row */}
          <div className="flex items-center gap-2">
            <button onClick={() => setSource('modrinth')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${source === 'modrinth' ? 'text-[#1bd96a] shadow-lg' : 'text-gray-400 hover:text-white'}`}
              style={source === 'modrinth' ? { background: 'rgba(27,217,106,0.08)', border: '1px solid rgba(27,217,106,0.2)', boxShadow: '0 0 20px rgba(27,217,106,0.06)' } : { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <svg width="16" height="16" viewBox="0 0 512 514" fill="currentColor"><path d="M503.16 323.56C514.55 281.47 515.32 237.22 505.23 194.56C495.13 151.9 474.51 112.73 445.05 80.81L404.36 114.14C427.9 139.84 443.95 171.42 451.35 205.77C458.75 240.13 457.18 275.75 446.84 309.33L503.16 323.56Z"/><path d="M373.46 369.03C346.07 391.08 312.18 404.53 276.67 407.85L282.86 466.29C326.88 462.08 368.67 445.32 402.73 418.18L373.46 369.03Z"/><path d="M195.98 407.85C160.46 404.53 128.56 391.08 101.18 369.03L71.9 418.18C105.97 445.32 147.76 462.08 191.78 466.29L195.98 407.85Z"/><path d="M41.34 309.33C31 275.75 29.43 240.13 36.83 205.77C44.23 171.42 60.28 139.84 83.82 114.14L43.13 80.81C13.67 112.73 -6.95 151.9 -17.05 194.56C-27.14 237.22 -26.37 281.47 -14.98 323.56L41.34 309.33Z"/><path d="M255.74 0L175.53 134.69L255.74 134.69L335.96 134.69L255.74 0Z"/><path d="M255.74 513.84L335.96 379.15L255.74 379.15L175.53 379.15L255.74 513.84Z"/></svg>
              Modrinth
            </button>
            <button onClick={() => spigotAllowed && setSource('spigot')} disabled={!spigotAllowed}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed ${source === 'spigot' ? 'text-[#ee8a18] shadow-lg' : 'text-gray-400 hover:text-white'}`}
              style={source === 'spigot' ? { background: 'rgba(238,138,24,0.08)', border: '1px solid rgba(238,138,24,0.2)', boxShadow: '0 0 20px rgba(238,138,24,0.06)' } : { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
              🔧 SpigotMC
            </button>
            {!spigotAllowed && <span className="text-[10px] text-gray-600 ml-1">SpigotMC unavailable for {projectType === 'mod' ? 'mod' : 'proxy'} servers</span>}
          </div>

          {/* Browse mode tabs (Trending / Downloaded / Updated / New) */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {activeBrowseModes.map(mode => (
              <button key={mode.id} onClick={() => { setBrowseMode(mode.id); setSearchQ(''); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${browseMode === mode.id && !searchQ ? 'bg-white/8 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'}`}>
                <span>{mode.icon}</span> {mode.label}
              </button>
            ))}
          </div>

          {/* Search + Filters */}
          <div className="neo-card p-3 space-y-3">
            <div className="flex gap-2 flex-wrap">
              {/* Search bar */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="text" value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
                  placeholder={`Search ${noun.toLowerCase()} on ${source === 'modrinth' ? 'Modrinth' : 'SpigotMC'}...`}
                  className="input-field pl-10 text-sm w-full"
                  onKeyDown={(e) => e.key === 'Enter' && search(0)} />
                {searchQ && (
                  <button onClick={() => { setSearchQ(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button onClick={() => search(0)} disabled={searching} className="btn-primary text-xs px-4 flex items-center gap-1.5">
                {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />} Search
              </button>
            </div>

            {/* Filter row */}
            <div className="flex gap-2 flex-wrap">
              {source === 'modrinth' ? (
                <>
                  <select value={selectedLoader} onChange={(e) => setSelectedLoader(e.target.value)}
                    className="input-field text-xs min-w-[120px]" style={{ background: '#1a1f2e', color: '#e5e7eb', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '32px' }}>
                    <option value="" style={{ background: '#1a1f2e', color: '#e5e7eb' }}>All Loaders</option>
                    {filteredLoaders.map((l: any) => (
                      <option key={l.name} value={l.name} style={{ background: '#1a1f2e', color: '#e5e7eb' }}>{l.name}</option>
                    ))}
                  </select>
                  <select value={selectedGameVersion} onChange={(e) => setSelectedGameVersion(e.target.value)}
                    className="input-field text-xs min-w-[110px]" style={{ background: '#1a1f2e', color: '#e5e7eb', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '32px' }}>
                    <option value="" style={{ background: '#1a1f2e', color: '#e5e7eb' }}>All MC Versions</option>
                    {filteredGameVersions.slice(0, 100).map((v: any) => (
                      <option key={v.version} value={v.version} style={{ background: '#1a1f2e', color: '#e5e7eb' }}>{v.version}</option>
                    ))}
                  </select>
                  <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
                    className="input-field text-xs min-w-[130px]" style={{ background: '#1a1f2e', color: '#e5e7eb', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '32px' }}>
                    <option value="" style={{ background: '#1a1f2e', color: '#e5e7eb' }}>All Categories</option>
                    {filteredCategories.map((c: any) => (
                      <option key={c.name} value={c.name} style={{ background: '#1a1f2e', color: '#e5e7eb' }}>{c.name}</option>
                    ))}
                  </select>
                </>
              ) : (
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
                  className="input-field text-xs min-w-[130px]" style={{ background: '#1a1f2e', color: '#e5e7eb', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '32px' }}>
                  <option value="" style={{ background: '#1a1f2e', color: '#e5e7eb' }}>All Categories</option>
                  {spigetCategories.map((c: any) => (
                    <option key={c.id} value={String(c.id)} style={{ background: '#1a1f2e', color: '#e5e7eb' }}>{c.name}</option>
                  ))}
                </select>
              )}
              {/* Active filters summary */}
              {(selectedLoader || selectedGameVersion || selectedCategory) && (
                <button onClick={() => { setSelectedLoader(''); setSelectedGameVersion(profile?.minecraftVersion || ''); setSelectedCategory(''); }}
                  className="text-[10px] text-gray-500 hover:text-white px-2 py-1 rounded hover:bg-white/5 transition-colors flex items-center gap-1">
                  <X className="w-3 h-3" /> Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Results info bar */}
          {!searching && results.length > 0 && (
            <div className="flex items-center justify-between px-1">
              <p className="text-[11px] text-gray-500">
                {source === 'modrinth' ? `${totalHits.toLocaleString()} results` : `Showing ${results.length} ${noun.toLowerCase()}`}
                {currentPage > 0 ? ` · Page ${currentPage + 1}` : ''}
                {selectedGameVersion && ` · MC ${selectedGameVersion}`}
              </p>
              {source === 'modrinth' && selectedGameVersion && (
                <span className="text-[10px] text-emerald-400/60 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Filtered for your server version
                </span>
              )}
            </div>
          )}

          {/* Results grid */}
          {searching && results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <span className="text-xs text-gray-500">Searching {source === 'modrinth' ? 'Modrinth' : 'SpigotMC'}...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="neo-card p-12 text-center">
              <Puzzle className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-400 font-medium">No {noun.toLowerCase()} found</p>
              <p className="text-xs text-gray-600 mt-1">Try different search terms or adjust your filters</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {results.map((item: any) => {
                const key = String(item.project_id || item.slug || item.id);
                const isInstalled = isInstalledResult(item);
                const iconUrl = source === 'modrinth'
                  ? item.icon_url
                  : (item.icon?.data ? `data:image/jpeg;base64,${item.icon.data}` : (item.icon?.url ? `https://api.spiget.org/v2/${item.icon.url}` : null));
                const downloads = item.downloads || 0;
                const author = source === 'modrinth' ? item.author : undefined;
                const testedVersions = Array.isArray(item.testedVersions) ? item.testedVersions : [];
                const displayCategories = source === 'modrinth' ? (item.display_categories || item.categories || []) : [];
                const isExternal = source === 'spigot' && item.external;
                const isPremium = source === 'spigot' && item.premium;

                // Compatibility indicator for Spiget
                const mcVersion = profile?.minecraftVersion;
                const isCompatible = source === 'spigot' && mcVersion && testedVersions.length > 0
                  ? testedVersions.some((v: string) => v === mcVersion || mcVersion.startsWith(v) || v.startsWith(mcVersion))
                  : null;

                return (
                  <div key={key} className={`neo-card p-4 flex items-start gap-3 group transition-all hover:border-white/10 ${isInstalled ? 'opacity-60' : ''}`}>
                    {/* Icon */}
                    {iconUrl
                      ? <img src={iconUrl} alt="" className="w-12 h-12 rounded-xl object-cover bg-white/5 shrink-0 shadow-sm" />
                      : <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] flex items-center justify-center shrink-0"><Puzzle className="w-5 h-5 text-gray-600" /></div>}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-white truncate">{item.title || item.name}</p>
                        {author && <span className="text-[11px] text-gray-500">by {author}</span>}
                        {isInstalled && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/12 text-emerald-400 font-bold border border-emerald-500/20">Installed</span>}
                        {isPremium && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/12 text-amber-400 font-bold border border-amber-500/20">Premium</span>}
                        {isExternal && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/12 text-blue-400 font-bold border border-blue-500/20">External</span>}
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-2 mt-1 leading-relaxed">{item.description || item.tag || 'No description available'}</p>
                      <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-2 flex-wrap">
                        <span className="flex items-center gap-1"><Download className="w-3 h-3" />{formatNumber(downloads)}</span>
                        {source === 'modrinth' && item.date_modified && (
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatRelativeDate(item.date_modified)}</span>
                        )}
                        {source === 'modrinth' && item.follows !== undefined && (
                          <span className="flex items-center gap-1">❤️ {formatNumber(item.follows)}</span>
                        )}
                        {source === 'spigot' && item.rating?.average > 0 && (
                          <span className="flex items-center gap-1">⭐ {Number(item.rating.average).toFixed(1)} ({item.rating.count})</span>
                        )}
                        {source === 'spigot' && testedVersions.length > 0 && (
                          <span className={`flex items-center gap-1 ${isCompatible === true ? 'text-emerald-400' : isCompatible === false ? 'text-orange-400' : 'text-gray-600'}`}>
                            {isCompatible === true ? <CheckCircle className="w-3 h-3" /> : isCompatible === false ? <AlertTriangle className="w-3 h-3" /> : null}
                            MC {testedVersions.slice(0, 3).join(', ')}{testedVersions.length > 3 ? '…' : ''}
                          </span>
                        )}
                        {displayCategories.slice(0, 3).map((c: string) => (
                          <span key={c} className="px-1.5 py-0.5 rounded-md bg-white/5 text-gray-500 text-[10px] border border-white/[0.03]">{c}</span>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-center">
                      {source === 'modrinth' && (item.slug || item.project_id) && (
                        <a href={`https://modrinth.com/${projectType}/${item.slug || item.project_id}`} target="_blank" rel="noreferrer"
                          className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors" title="View on Modrinth">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {source === 'spigot' && item.id && (
                        <a href={`https://www.spigotmc.org/resources/${item.id}/`} target="_blank" rel="noreferrer"
                          className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors" title="View on SpigotMC">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {/* Install button - opens version picker */}
                      {isInstalled ? (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-400" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                          <CheckCircle className="w-3.5 h-3.5" /> Installed
                        </span>
                      ) : source === 'modrinth' ? (
                        <button onClick={() => openModrinthVersionPicker(item)}
                          disabled={installing === key || loadingVersions}
                          className="btn-primary text-xs px-3 py-1.5 disabled:opacity-40 font-semibold">
                          {loadingVersions && installing === key ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Install'}
                        </button>
                      ) : (
                        <button onClick={() => openSpigetVersionPicker(item)}
                          disabled={installing === key || isPremium || isExternal}
                          className="btn-primary text-xs px-3 py-1.5 disabled:opacity-40 font-semibold"
                          title={isPremium ? 'Premium resource — download manually' : isExternal ? 'External resource — download manually' : 'Select version to install'}>
                          {installing === key ? <Loader2 className="w-3 h-3 animate-spin" /> :
                            isPremium ? 'Premium' : isExternal ? 'External' : 'Install'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 py-2">
              <button onClick={() => search(currentPage - 1)} disabled={currentPage === 0 || searching}
                className="btn-secondary text-xs px-4 py-2 disabled:opacity-30 font-medium">
                ← Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 5) page = i;
                  else if (currentPage < 3) page = i;
                  else if (currentPage > totalPages - 3) page = totalPages - 5 + i;
                  else page = currentPage - 2 + i;
                  return (
                    <button key={page} onClick={() => search(page)} disabled={searching}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${page === currentPage ? 'bg-primary/15 text-primary border border-primary/20' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
                      {page + 1}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => search(currentPage + 1)} disabled={currentPage >= totalPages - 1 || searching}
                className="btn-secondary text-xs px-4 py-2 disabled:opacity-30 font-medium">
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ======== INSTALLED VIEW ======== */}
      {activeView === 'installed' && (
        <div className="space-y-3">
          {/* Update All bar */}
          {hasUpdates && (
            <div className="neo-card p-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.04) 0%, rgba(249,115,22,0.04) 100%)', border: '1px solid rgba(234,179,8,0.12)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)' }}>
                  <RefreshCw className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <span className="text-xs text-yellow-300 font-bold">{updates.length} update{updates.length > 1 ? 's' : ''} available</span>
                  <p className="text-[10px] text-gray-500 mt-0.5">Click "Update All" to update everything at once</p>
                </div>
              </div>
              <button onClick={updateAll} disabled={updatingAll}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all text-white"
                style={{ background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.3)' }}>
                {updatingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Update All
              </button>
            </div>
          )}

          {loadingInstalled ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <span className="text-xs text-gray-500">Loading installed {noun.toLowerCase()}...</span>
            </div>
          ) : installed.length === 0 ? (
            <div className="neo-card p-12 text-center">
              <Puzzle className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-400 font-medium">No {noun.toLowerCase()} installed yet</p>
              <p className="text-xs text-gray-600 mt-1">Browse and install {noun.toLowerCase()} from the Browse tab</p>
              <button onClick={() => setActiveView('browse')} className="btn-primary text-xs mt-4 px-4 py-2">
                Browse {noun}
              </button>
            </div>
          ) : (
            <div className="grid gap-2">
              {installed.map((plugin: any) => {
                const fileName = String(plugin.fileName || plugin.file || plugin.name || '');
                const update = updatesByFile.get(fileName);
                const sourceLabel = plugin.source === 'modrinth' ? 'Modrinth' : plugin.source === 'spiget' ? 'SpigotMC' : null;
                const sourceColor = plugin.source === 'modrinth' ? 'text-[#1bd96a]' : plugin.source === 'spiget' ? 'text-[#ee8a18]' : 'text-gray-500';
                return (
                  <div key={fileName} className={`neo-card p-4 flex items-center gap-3 transition-all ${update ? 'border-yellow-500/10' : ''}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${update ? 'bg-yellow-500/8 border border-yellow-500/15' : 'bg-white/5'}`}>
                      {update ? <RefreshCw className="w-4 h-4 text-yellow-400" /> : <Puzzle className="w-4 h-4 text-gray-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm text-white font-semibold truncate">{plugin.title || fileName}</p>
                        {update && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 font-bold border border-yellow-500/20 animate-pulse">
                            Update Available
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-1 flex-wrap">
                        {plugin.currentVersion && <span className="font-mono">v{plugin.currentVersion}</span>}
                        {update && (
                          <span className="text-yellow-400 font-mono">→ v{update.latestVersion || 'latest'}</span>
                        )}
                        {sourceLabel && (
                          <span className={`px-1.5 py-0.5 rounded-md bg-white/5 text-[10px] font-medium ${sourceColor}`}>{sourceLabel}</span>
                        )}
                        {plugin.installedAt && <span>Installed {formatRelativeDate(plugin.installedAt)}</span>}
                        <span className="text-gray-600 font-mono text-[10px] truncate max-w-[150px]">{fileName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {update && (
                        <button onClick={() => updateOne(fileName)} disabled={updatingFile === fileName}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-yellow-400 transition-all hover:bg-yellow-500/10"
                          style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}>
                          {updatingFile === fileName ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                          Update
                        </button>
                      )}
                      <button onClick={() => remove(fileName)}
                        className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-500/5 transition-all" title="Remove">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======== VERSION PICKER MODAL (Modrinth + Spiget) ======== */}
      <AnimatePresence>
        {versionPicker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setVersionPicker(null); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="neo-card max-w-xl w-full max-h-[80vh] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="p-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.04) 0%, transparent 100%)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {versionPicker.iconUrl ? (
                  <img src={versionPicker.iconUrl} alt="" className="w-10 h-10 rounded-xl object-cover bg-white/5" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center"><Puzzle className="w-4 h-4 text-gray-500" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">{versionPicker.projectTitle}</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Select a version to install · {versionPicker.versions.length} version{versionPicker.versions.length !== 1 ? 's' : ''} available
                    {versionPicker.source === 'modrinth' ? ' · Modrinth' : ' · SpigotMC'}
                  </p>
                </div>
                <button onClick={() => setVersionPicker(null)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Versions list */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {versionPicker.versions.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-sm">No compatible versions found</div>
                ) : versionPicker.source === 'modrinth' ? (
                  /* Modrinth versions */
                  versionPicker.versions.map((v: any) => {
                    const vId = String(v.id);
                    const gameVersions = (v.game_versions || []).slice(0, 5);
                    const loaders = (v.loaders || []).slice(0, 4);
                    const vType = v.version_type || 'release';
                    const typeColors: Record<string, string> = {
                      release: 'bg-emerald-500/12 text-emerald-400 border-emerald-500/20',
                      beta: 'bg-yellow-500/12 text-yellow-400 border-yellow-500/20',
                      alpha: 'bg-red-500/12 text-red-400 border-red-500/20',
                    };
                    return (
                      <div key={vId} className="rounded-xl p-3 hover:bg-white/[0.03] transition-all flex items-start gap-3" style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-white">{v.name || v.version_number}</p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold border ${typeColors[vType] || typeColors.release}`}>{vType}</span>
                            {v.featured && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/12 text-primary font-bold border border-primary/20">⭐ Featured</span>}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-1.5 flex-wrap">
                            {v.version_number && v.name !== v.version_number && <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded">{v.version_number}</span>}
                            {gameVersions.length > 0 && <span>MC {gameVersions.join(', ')}{(v.game_versions || []).length > 5 ? '…' : ''}</span>}
                            {loaders.length > 0 && loaders.map((l: string) => (
                              <span key={l} className="px-1.5 py-0.5 rounded bg-white/5 text-[10px]">{l}</span>
                            ))}
                            {v.downloads !== undefined && <span>{formatNumber(v.downloads)} downloads</span>}
                            {v.date_published && <span>{formatRelativeDate(v.date_published)}</span>}
                          </div>
                        </div>
                        <button onClick={() => installModrinthVersion(versionPicker.projectId, vId, v.version_number || v.name)}
                          disabled={installing === vId}
                          className="btn-primary text-xs px-3 py-1.5 shrink-0 font-semibold">
                          {installing === vId ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Install'}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  /* Spiget versions */
                  <>
                    {/* Latest version highlighted */}
                    {versionPicker.versions.length > 0 && (() => {
                      const latest = versionPicker.versions[0];
                      const vId = String(latest.id);
                      const resourceId = latest._resourceId;
                      return (
                        <div key={`latest-${vId}`} className="rounded-xl p-3 transition-all" style={{ background: 'rgba(27,217,106,0.04)', border: '1px solid rgba(27,217,106,0.12)' }}>
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-white">{latest.name || `Version ${vId}`}</p>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-emerald-500/12 text-emerald-400 border border-emerald-500/20">Latest</span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-1">
                                {latest.releaseDate && <span>Released {formatRelativeDate(latest.releaseDate)}</span>}
                                {latest.downloads !== undefined && <span>{formatNumber(latest.downloads)} downloads</span>}
                                <span className="font-mono text-[10px] text-gray-600">ID: {vId}</span>
                              </div>
                            </div>
                            <button onClick={() => installSpiget({ id: resourceId, name: latest._resourceName })}
                              disabled={installing === String(resourceId)}
                              className="btn-primary text-xs px-4 py-1.5 shrink-0 font-semibold">
                              {installing === String(resourceId) ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Install Latest'}
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Other versions */}
                    {versionPicker.versions.slice(1).map((v: any) => {
                      const vId = String(v.id);
                      const resourceId = v._resourceId;
                      return (
                        <div key={vId} className="rounded-xl p-3 hover:bg-white/[0.03] transition-all flex items-start gap-3" style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-white">{v.name || `Version ${vId}`}</p>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-1">
                              {v.releaseDate && <span>Released {formatRelativeDate(v.releaseDate)}</span>}
                              {v.downloads !== undefined && <span>{formatNumber(v.downloads)} downloads</span>}
                              <span className="font-mono text-[10px] text-gray-600">ID: {vId}</span>
                            </div>
                          </div>
                          <button onClick={() => installSpigetVersion(resourceId, Number(vId), v.name || vId)}
                            disabled={installing === vId}
                            className="btn-secondary text-xs px-3 py-1.5 shrink-0 font-medium">
                            {installing === vId ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Install'}
                          </button>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ──────── PLAYERS TAB ──────── */
function PlayersTab({ serverUuid }: { serverUuid: string }) {
  const [online, setOnline] = useState<any>(null);
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [banned, setBanned] = useState<any[]>([]);
  const [bannedIps, setBannedIps] = useState<any[]>([]);
  const [playerData, setPlayerData] = useState<any[]>([]);
  const [playerDataWorlds, setPlayerDataWorlds] = useState<string[]>([]);
  const [ops, setOps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMinecraft, setIsMinecraft] = useState(false);
  const [playerInput, setPlayerInput] = useState('');
  const [subTab, setSubTab] = useState<'online' | 'whitelist' | 'banned' | 'bannedIps' | 'playerData' | 'ops'>('online');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!serverUuid) return;
    try {
      const detect = await playersApi.detect(serverUuid);
      const detectData = detect.data;
      const detected = typeof detectData === 'boolean'
        ? detectData
        : !!(detectData?.minecraft || detectData?.isMinecraft);
      if (!detected) { setIsMinecraft(false); setLoading(false); return; }
      setIsMinecraft(true);
      const [onl, wl, bn, bip, pd, op] = await Promise.all([
        playersApi.online(serverUuid).catch(() => ({ data: null })),
        playersApi.whitelist(serverUuid).catch(() => ({ data: [] })),
        playersApi.banned(serverUuid).catch(() => ({ data: [] })),
        playersApi.bannedIps(serverUuid).catch(() => ({ data: [] })),
        playersApi.playerData(serverUuid).catch(() => ({ data: { players: [], worlds: [] } })),
        playersApi.ops(serverUuid).catch(() => ({ data: [] })),
      ]);
      setOnline(onl.data);
      setWhitelist(Array.isArray(wl.data) ? wl.data.map((w: any) => typeof w === 'string' ? w : w.name) : []);
      setBanned(Array.isArray(bn.data) ? bn.data : []);
      setBannedIps(Array.isArray(bip.data) ? bip.data : []);
      setPlayerData(Array.isArray(pd.data?.players) ? pd.data.players : (Array.isArray(pd.data) ? pd.data : []));
      setPlayerDataWorlds(Array.isArray(pd.data?.worlds) ? pd.data.worlds : []);
      setOps(Array.isArray(op.data) ? op.data : []);
    } catch {}
    finally { setLoading(false); }
  }, [serverUuid]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const action = async (fn: () => Promise<any>, msg: string) => {
    setActionLoading(true);
    try { await fn(); toast.success(msg); setPlayerInput(''); fetchAll(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
    finally { setActionLoading(false); }
  };
  const inputPlaceholder = subTab === 'bannedIps'
    ? 'IP address'
    : subTab === 'playerData'
      ? 'Player name or UUID'
      : 'Player name';

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;
  if (!isMinecraft) return <div className="neo-card p-8 text-center text-gray-500 text-sm">Player management is only available for Minecraft servers.</div>;

  return (
    <div className="space-y-4">
      {/* Sub tabs */}
      <div className="flex gap-1">
        {[
          { id: 'online' as const, label: `Online (${online?.count || 0})`, icon: Users },
          { id: 'whitelist' as const, label: `Whitelist (${whitelist.length})`, icon: Shield },
          { id: 'banned' as const, label: `Banned (${banned.length})`, icon: Ban },
          { id: 'bannedIps' as const, label: `Banned IPs (${bannedIps.length})`, icon: Lock },
          { id: 'playerData' as const, label: `Player Data (${playerData.length})`, icon: FileArchive },
          { id: 'ops' as const, label: `Ops (${ops.length})`, icon: Gavel },
        ].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${subTab === t.id ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-white'}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* Action input */}
      {subTab !== 'online' && (
        <div className="neo-card p-3 flex gap-2">
          <input type="text" value={playerInput} onChange={e => setPlayerInput(e.target.value)} placeholder={inputPlaceholder}
            className="input-field text-sm flex-1" onKeyDown={e => {
              if (e.key !== 'Enter' || !playerInput.trim()) return;
              if (subTab === 'whitelist') action(() => playersApi.addWhitelist(serverUuid, playerInput), 'Added to whitelist');
              if (subTab === 'banned') action(() => playersApi.ban(serverUuid, playerInput), 'Banned');
              if (subTab === 'bannedIps') action(() => playersApi.banIp(serverUuid, playerInput), 'IP banned');
              if (subTab === 'playerData') {
                const target = playerInput.trim();
                if (!confirm(`Delete all stored player data for "${target}"? Server must be offline.`)) return;
                action(() => playersApi.deletePlayerData(serverUuid, target), 'Player data deleted');
              }
              if (subTab === 'ops') action(() => playersApi.op(serverUuid, playerInput), 'Opped');
            }} />
          <button disabled={actionLoading || !playerInput.trim()} className="btn-primary text-xs"
            onClick={() => {
              if (subTab === 'whitelist') action(() => playersApi.addWhitelist(serverUuid, playerInput), 'Added');
              if (subTab === 'banned') action(() => playersApi.ban(serverUuid, playerInput), 'Banned');
              if (subTab === 'bannedIps') action(() => playersApi.banIp(serverUuid, playerInput), 'IP banned');
              if (subTab === 'playerData') {
                const target = playerInput.trim();
                if (!confirm(`Delete all stored player data for "${target}"? Server must be offline.`)) return;
                action(() => playersApi.deletePlayerData(serverUuid, target), 'Player data deleted');
              }
              if (subTab === 'ops') action(() => playersApi.op(serverUuid, playerInput), 'Opped');
            }}>
            {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
          </button>
        </div>
      )}
      {subTab === 'playerData' && (
        <div className="text-xs text-amber-400/80 px-1">
          Stop the server before deleting player data. This removes `playerdata`, `stats`, and `advancements` files for the selected player UUID.
        </div>
      )}

      {/* Lists */}
      <div className="neo-card overflow-hidden">
        {subTab === 'online' && (
          online?.players?.length ? (
            <div className="divide-y divide-white/5">
              {online.players.map((p: string) => (
                <div key={p} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-gray-300">{p}</span>
                  <button onClick={() => action(() => playersApi.kick(serverUuid, p), `Kicked ${p}`)}
                    className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1">
                    <UserMinus className="w-3 h-3" /> Kick
                  </button>
                </div>
              ))}
            </div>
          ) : <div className="p-8 text-center text-gray-500 text-sm">{online ? `${online.count || 0}/${online.max || '?'} players` : 'No data'}</div>
        )}

        {subTab === 'whitelist' && (
          whitelist.length ? (
            <div className="divide-y divide-white/5">
              {whitelist.map(p => (
                <div key={p} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-gray-300">{p}</span>
                  <button onClick={() => action(() => playersApi.removeWhitelist(serverUuid, p), 'Removed')}
                    className="text-xs text-gray-500 hover:text-red-400"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          ) : <div className="p-8 text-center text-gray-500 text-sm">Whitelist empty</div>
        )}

        {subTab === 'banned' && (
          banned.length ? (
            <div className="divide-y divide-white/5">
              {banned.map((b: any) => {
                const name = typeof b === 'string' ? b : b.name;
                return (
                  <div key={name} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <span className="text-sm text-gray-300">{name}</span>
                      {b.reason && <span className="text-xs text-gray-600 ml-2">{b.reason}</span>}
                    </div>
                    <button onClick={() => action(() => playersApi.unban(serverUuid, name), 'Unbanned')}
                      className="text-xs text-gray-500 hover:text-green-400">Unban</button>
                  </div>
                );
              })}
            </div>
          ) : <div className="p-8 text-center text-gray-500 text-sm">No banned players</div>
        )}

        {subTab === 'ops' && (
          ops.length ? (
            <div className="divide-y divide-white/5">
              {ops.map((o: any) => {
                const name = typeof o === 'string' ? o : o.name;
                return (
                  <div key={name} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-gray-300">{name}</span>
                    <button onClick={() => action(() => playersApi.deop(serverUuid, name), 'De-opped')}
                      className="text-xs text-gray-500 hover:text-orange-400">Remove OP</button>
                  </div>
                );
              })}
            </div>
          ) : <div className="p-8 text-center text-gray-500 text-sm">No operators</div>
        )}

        {subTab === 'bannedIps' && (
          bannedIps.length ? (
            <div className="divide-y divide-white/5">
              {bannedIps.map((b: any) => {
                const ip = typeof b === 'string' ? b : b.ip || b.name;
                return (
                  <div key={ip} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <span className="text-sm text-gray-300">{ip}</span>
                      {b?.reason && <span className="text-xs text-gray-600 ml-2">{b.reason}</span>}
                    </div>
                    <button onClick={() => action(() => playersApi.unbanIp(serverUuid, ip), 'IP unbanned')}
                      className="text-xs text-gray-500 hover:text-green-400">Unban</button>
                  </div>
                );
              })}
            </div>
          ) : <div className="p-8 text-center text-gray-500 text-sm">No banned IPs</div>
        )}

        {subTab === 'playerData' && (
          playerData.length ? (
            <div className="divide-y divide-white/5">
              {playerData.map((p: any) => {
                const uuid = String(p?.uuid || '');
                const label = p?.name ? `${p.name}` : uuid;
                const files = Array.isArray(p?.files) ? p.files : [];
                const worlds = Array.isArray(p?.worlds) ? p.worlds : [];
                return (
                  <div key={uuid || label} className="flex items-center justify-between px-4 py-2.5 gap-3">
                    <div className="min-w-0">
                      <div className="text-sm text-gray-300 truncate">{label}</div>
                      <div className="text-xs text-gray-600 truncate">
                        {uuid || 'unknown uuid'} • {files.length || p?.fileCount || 0} file(s)
                        {worlds.length ? ` • ${worlds.join(', ')}` : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const target = uuid || label;
                        if (!target) return;
                        if (!confirm(`Delete all stored player data for "${target}"? Server must be offline.`)) return;
                        action(() => playersApi.deletePlayerData(serverUuid, target), 'Player data deleted');
                      }}
                      className="text-xs text-gray-500 hover:text-red-400 whitespace-nowrap"
                    >
                      Delete Data
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 text-sm">
              No player data files found{playerDataWorlds.length ? ` in ${playerDataWorlds.join(', ')}` : ''}.
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* ──────── SCHEDULES TAB ──────── */
function SchedulesTab({ serverId }: { serverId: string }) {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', is_active: true, minute: '*/30', hour: '*', day_of_week: '*', day_of_month: '*', month: '*' });
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<{ scheduleId: number } | null>(null);
  const [taskForm, setTaskForm] = useState({ action: 'command' as 'command' | 'power' | 'backup', payload: '', time_offset: 0 });

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const r = await serversApi.schedules(serverId); setSchedules(r.data?.data || r.data || []); }
    catch { toast.error('Failed to load schedules'); }
    finally { setLoading(false); }
  }, [serverId]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async () => {
    if (!form.name.trim()) return;
    setCreating(true);
    try { await serversApi.createSchedule(serverId, form); toast.success('Schedule created'); setShowForm(false); setForm({ name: '', is_active: true, minute: '*/30', hour: '*', day_of_week: '*', day_of_month: '*', month: '*' }); fetch(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
    finally { setCreating(false); }
  };

  const remove = async (scheduleId: number) => {
    if (!confirm('Delete this schedule?')) return;
    try { await serversApi.deleteSchedule(serverId, scheduleId); toast.success('Deleted'); fetch(); }
    catch { toast.error('Failed'); }
  };

  const execute = async (scheduleId: number) => {
    try { await serversApi.executeSchedule(serverId, scheduleId); toast.success('Schedule triggered'); }
    catch { toast.error('Failed'); }
  };

  const addTask = async (scheduleId: number) => {
    if (!taskForm.payload.trim() && taskForm.action !== 'backup') return;
    try {
      await serversApi.createTask(serverId, scheduleId, taskForm);
      toast.success('Task added');
      setEditingTask(null);
      setTaskForm({ action: 'command', payload: '', time_offset: 0 });
      fetch();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
  };

  const removeTask = async (scheduleId: number, taskId: number) => {
    try { await serversApi.deleteTask(serverId, scheduleId, taskId); toast.success('Task removed'); fetch(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-white">Scheduled Tasks</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Schedule
        </button>
      </div>

      {showForm && (
        <div className="neo-card p-4 space-y-3">
          <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Schedule name" className="input-field text-sm" />
          <div className="grid grid-cols-5 gap-2">
            {(['minute', 'hour', 'day_of_week', 'day_of_month', 'month'] as const).map(f => (
              <div key={f}>
                <label className="text-xs text-gray-500 block mb-1">{f.replace(/_/g, ' ')}</label>
                <input type="text" value={form[f]} onChange={e => setForm({ ...form, [f]: e.target.value })} className="input-field text-xs font-mono" />
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="btn-secondary text-xs">Cancel</button>
            <button onClick={create} disabled={creating} className="btn-primary text-xs">{creating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Create'}</button>
          </div>
        </div>
      )}

      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div> :
        schedules.length === 0 ? <div className="neo-card p-8 text-center text-gray-500 text-sm">No schedules. Create one to automate tasks like restarts and backups.</div> :
        <div className="grid gap-3">
          {schedules.map((s: any) => (
            <div key={s.id} className="neo-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CalendarClock className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-white">{s.name}</p>
                    <p className="text-xs text-gray-500 font-mono">{s.cron?.minute || s.minute} {s.cron?.hour || s.hour} {s.cron?.day_of_week || s.day_of_week} {s.cron?.day_of_month || s.day_of_month} {s.cron?.month || s.month}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${s.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>{s.is_active ? 'Active' : 'Disabled'}</span>
                  <button onClick={() => execute(s.id)} className="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-primary" title="Run now"><Play className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setEditingTask(editingTask?.scheduleId === s.id ? null : { scheduleId: s.id })} className="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-white" title="Add task"><Plus className="w-3.5 h-3.5" /></button>
                  <button onClick={() => remove(s.id)} className="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-red-400" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              {/* Tasks */}
              {s.relationships?.tasks?.data?.length > 0 && (
                <div className="border-t border-white/5 pt-2 space-y-1">
                  {s.relationships.tasks.data.map((t: any) => (
                    <div key={t.attributes.id} className="flex items-center justify-between px-2 py-1.5 rounded bg-white/[0.02]">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">{t.attributes.action}</span>
                        <span className="text-xs text-gray-400 font-mono truncate max-w-[200px]">{t.attributes.payload || '—'}</span>
                        {t.attributes.time_offset > 0 && <span className="text-xs text-gray-600">+{t.attributes.time_offset}s</span>}
                      </div>
                      <button onClick={() => removeTask(s.id, t.attributes.id)} className="text-gray-500 hover:text-red-400"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add task form */}
              {editingTask?.scheduleId === s.id && (
                <div className="border-t border-white/5 pt-3 space-y-2">
                  <div className="flex gap-2">
                    <select value={taskForm.action} onChange={e => setTaskForm({ ...taskForm, action: e.target.value as any })} className="input-field text-xs w-32">
                      <option value="command">Command</option>
                      <option value="power">Power</option>
                      <option value="backup">Backup</option>
                    </select>
                    <input type="text" value={taskForm.payload} onChange={e => setTaskForm({ ...taskForm, payload: e.target.value })}
                      placeholder={taskForm.action === 'command' ? 'say Hello' : taskForm.action === 'power' ? 'start/stop/restart/kill' : ''} className="input-field text-xs flex-1 font-mono" />
                    <input type="number" value={taskForm.time_offset} onChange={e => setTaskForm({ ...taskForm, time_offset: parseInt(e.target.value) || 0 })}
                      className="input-field text-xs w-20" placeholder="Delay (s)" />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingTask(null)} className="btn-secondary text-xs">Cancel</button>
                    <button onClick={() => addTask(s.id)} className="btn-primary text-xs">Add Task</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>}
    </div>
  );
}

/* ──────── ACTIVITY TAB ──────── */
function ActivityTab({ serverId }: { serverId: string }) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    serversApi.activity(serverId).then(r => setActivities(r.data?.data || r.data || []))
      .catch(() => toast.error('Failed to load activity'))
      .finally(() => setLoading(false));
  }, [serverId]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;

  return (
    <div className="space-y-2">
      {activities.length === 0 ? <div className="neo-card p-8 text-center text-gray-500 text-sm">No recent activity</div> :
        activities.map((a: any, i: number) => (
          <div key={a.id || i} className="neo-card p-3 flex items-center gap-3">
            <Activity className="w-4 h-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-300 truncate">{a.event || a.description || 'Unknown action'}</p>
              <div className="flex items-center gap-3 text-xs text-gray-600 mt-0.5">
                {a.ip && <span>{a.ip}</span>}
                {a.timestamp && <span>{new Date(a.timestamp).toLocaleString()}</span>}
                {a.created_at && <span>{new Date(a.created_at).toLocaleString()}</span>}
              </div>
            </div>
            {a.properties && Object.keys(a.properties).length > 0 && (
              <span className="text-xs text-gray-600 font-mono truncate max-w-[150px]">{JSON.stringify(a.properties)}</span>
            )}
          </div>
        ))}
    </div>
  );
}

/* ──────── SETTINGS TAB ──────── */
function SettingsTab({ serverId, serverName, onRenamed }: { serverId: string; serverName: string; onRenamed: () => void }) {
  const [name, setName] = useState(serverName);
  const [saving, setSaving] = useState(false);
  const [reinstalling, setReinstalling] = useState(false);

  const handleRename = async () => {
    if (!name.trim() || name.trim().length < 2) { toast.error('Name must be at least 2 characters'); return; }
    setSaving(true);
    try { await serversApi.renameServer(serverId, name.trim()); toast.success('Server renamed'); onRenamed(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Rename failed'); }
    finally { setSaving(false); }
  };

  const handleReinstall = async () => {
    if (!confirm('Are you sure? This will wipe all server files and reinstall from scratch. This cannot be undone.')) return;
    setReinstalling(true);
    try { await serversApi.reinstall(serverId); toast.success('Reinstall started. This may take a few minutes.'); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Reinstall failed'); }
    finally { setReinstalling(false); }
  };

  return (
    <div className="space-y-6">
      {/* Rename */}
      <div className="neo-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Edit3 className="w-4 h-4 text-primary" /> Rename Server</h3>
        <p className="text-xs text-gray-500">Change the display name of your server.</p>
        <div className="flex gap-2">
          <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-field text-sm flex-1" placeholder="Server name" />
          <button onClick={handleRename} disabled={saving || name === serverName} className="btn-primary text-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
          </button>
        </div>
      </div>

      {/* Reinstall */}
      <div className="neo-card p-5 space-y-3" style={{ borderColor: 'rgba(239,68,68,0.15)' }}>
        <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Reinstall Server</h3>
        <p className="text-xs text-gray-500">This will stop and wipe all server files, then reinstall from the egg template. All data will be lost.</p>
        <button onClick={handleReinstall} disabled={reinstalling} className="btn-danger text-sm">
          {reinstalling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reinstall Server'}
        </button>
      </div>
    </div>
  );
}
