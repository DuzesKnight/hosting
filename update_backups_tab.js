const fs = require('fs');
const file = '/workspaces/hosting/frontend/src/app/dashboard/servers/[id]/page.tsx';
let txt = fs.readFileSync(file, 'utf8');

const regex = /\/\*\s*────────\s*BACKUPS TAB\s*────────\s*\*\/[\s\S]*?(?=\/\*\s*────────\s*NETWORK TAB\s*────────\s*\*\/)/m;

const replacement = `/* ──────── BACKUPS TAB ──────── */
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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Create Backup / Dashboard */}
      <div className="neo-card p-6 bg-gradient-to-br from-[#09090b]/80 to-[#101018]/80 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 blur-[60px] rounded-full pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-700" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 w-full md:w-auto">
             <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)] relative">
               <div className="absolute inset-0 rounded-xl bg-emerald-400/20 animate-ping opacity-20" />
               <Download className="w-5 h-5 text-emerald-400" />
             </div>
             <div>
               <h3 className="text-white font-display font-bold text-base tracking-wide flex items-center gap-2">Disaster Recovery <span className="px-2 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-widest">{backups.length} Snapshots</span></h3>
               <p className="text-xs text-gray-400 mt-1 max-w-sm">Create and manage point-in-time snapshots of your server data.</p>
             </div>
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }} 
            onClick={create} 
            disabled={creating} 
            className="h-12 x-6 w-full md:w-auto px-8 rounded-xl font-bold tracking-widest text-xs transition-all flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <>CREATE SNAPSHOT <Plus className="w-4 h-4" /></>}
          </motion.button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <span className="text-sm font-medium tracking-widest text-emerald-400/50">FETCHING BACKUPS</span>
        </div>
      ) : backups.length === 0 ? (
        <div className="p-16 flex flex-col items-center justify-center space-y-4 neo-card bg-black/20">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
            <Archive className="w-6 h-6 text-gray-400" />
          </div>
          <div className="text-center text-gray-400 text-sm tracking-widest uppercase font-semibold">NO SNAPSHOTS AVAILABLE</div>
        </div>
      ) : (
        <div className="grid gap-4">
          {backups.map((b: any, i) => (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} key={b.uuid || b.id} className="neo-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-colors">
                  <Archive className="w-4 h-4 text-gray-400 group-hover:text-emerald-400 transition-colors" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-[14px]">{b.name || 'Automated Snapshot'}</span>
                    {b.is_locked ? <Lock className="w-3 h-3 text-yellow-400" /> : null}
                    {b.is_successful === false ? <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/20 uppercase tracking-wider font-bold">Failed</span> : null}
                  </div>
                  <div className="text-[11px] text-gray-500 flex items-center gap-3 mt-1 font-mono">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {b.created_at ? new Date(b.created_at).toLocaleString() : 'Unknown Data'}</span>
                    <span className="flex items-center gap-1"><Database className="w-3 h-3" /> {b.bytes ? (b.bytes > 1048576 ? `${(b.bytes/1048576).toFixed(1)} MB` : `${(b.bytes/1024).toFixed(0)} KB`) : '0 KB'}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5 shrink-0 self-end md:self-center auto-cols-auto">
                {b.is_successful !== false && (
                  <>
                    <motion.button whileHover={{ scale: 1.1, rotate: -180 }} whileTap={{ scale: 0.9 }} onClick={() => restore(b.uuid || b.id)} className="w-9 h-9 rounded-lg bg-transparent flex items-center justify-center text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all font-medium text-xs" title="Restore Snapshot">
                      <RotateCw className="w-4 h-4" />
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.1, y: 2 }} whileTap={{ scale: 0.9 }} onClick={() => download(b.uuid || b.id)} className="w-9 h-9 rounded-lg bg-transparent flex items-center justify-center text-gray-400 hover:text-primary hover:bg-primary/10 transition-all" title="Download Archive">
                      <Download className="w-4 h-4" />
                    </motion.button>
                  </>
                )}
                <div className="w-[1px] h-5 bg-white/10 mx-1" />
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => toggleLock(b.uuid || b.id)} className={`w-9 h-9 rounded-lg bg-transparent flex items-center justify-center transition-all ${b.is_locked ? 'text-yellow-400 bg-yellow-500/10' : 'text-gray-400 hover:text-white hover:bg-white/10'}`} title={b.is_locked ? 'Unlock Snapshot' : 'Lock Snapshot (Prevent Auto-Delete)'}>
                  {b.is_locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </motion.button>
                <div className="w-[1px] h-5 bg-white/10 mx-1" />
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => remove(b.uuid || b.id)} disabled={b.is_locked} className="w-9 h-9 rounded-lg bg-transparent flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400" title="Delete Snapshot">
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

`;

txt = txt.replace(regex, replacement);
fs.writeFileSync(file, txt);
