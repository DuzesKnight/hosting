const fs = require('fs');
const file = '/workspaces/hosting/frontend/src/app/dashboard/servers/[id]/page.tsx';
let txt = fs.readFileSync(file, 'utf8');

const regex = /\/\*\s*────────\s*DATABASES TAB\s*────────\s*\*\/[\s\S]*?(?=\/\*\s*────────\s*BACKUPS TAB\s*────────\s*\*\/)/m;

const replacement = `/* ──────── DATABASES TAB ──────── */
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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="neo-card p-6 bg-gradient-to-br from-[#09090b]/80 to-[#101018]/80 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 blur-[60px] rounded-full pointer-events-none group-hover:bg-primary/20 transition-all duration-700" />
        <div className="relative z-10 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex items-center gap-3 w-full md:w-auto">
             <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_15px_rgba(0,212,255,0.15)]">
               <Database className="w-5 h-5 text-primary" />
             </div>
             <div>
               <h3 className="text-white font-bold text-sm tracking-wide">New Database</h3>
               <p className="text-[11px] text-gray-400">Create a new MySQL instance</p>
             </div>
          </div>
          <div className="flex-1 flex gap-3 w-full">
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter database name..." className="input-field flex-1 text-sm bg-black/40 h-11 border-white/5 focus:border-primary/50 shadow-inner" onKeyDown={e => e.key === 'Enter' && create()} />
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={create} disabled={creating || !name.trim()} className="h-11 px-6 rounded-xl font-bold tracking-wide text-xs transition-all flex items-center justify-center gap-2 min-w-[120px] bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 hover:border-primary/50 hover:shadow-[0_0_15px_rgba(0,212,255,0.3)] disabled:opacity-50">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <>CREATE DB <Plus className="w-3.5 h-3.5" /></>}
            </motion.button>
          </div>
        </div>
      </div>

      {loading ? (
         <div className="p-16 flex flex-col items-center justify-center space-y-4">
           <Loader2 className="w-8 h-8 text-primary animate-spin" />
           <span className="text-sm font-medium tracking-widest text-[#00d4ff]/50">FETCHING DATABASES</span>
         </div>
      ) : dbs.length === 0 ? (
        <div className="p-16 flex flex-col items-center justify-center space-y-3 opacity-50 neo-card bg-black/20">
          <Database className="w-12 h-12 text-primary" />
          <div className="text-center text-gray-400 text-sm tracking-wider">NO DATABASES FOUND</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {dbs.map((db: any, i) => (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} key={db.id} className="neo-card p-5 space-y-4 hover:border-primary/30 transition-colors group">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/20 group-hover:text-primary transition-all">
                    <Database className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <span className="font-bold text-white text-[15px] tracking-wide block">{db.name || db.database}</span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest block mt-0.5">ID: {db.id}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <motion.button whileHover={{ scale: 1.1, rotate: 180 }} whileTap={{ scale: 0.9 }} onClick={() => rotatePassword(db.id)} className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 flex items-center justify-center hover:bg-yellow-500/20 transition-all shadow-[0_0_10px_rgba(234,179,8,0.1)]" title="Rotate Password">
                    <RotateCw className="w-3.5 h-3.5" />
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => remove(db.id)} className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-all shadow-[0_0_10px_rgba(239,68,68,0.1)]" title="Delete Database">
                    <Trash2 className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </div>
              
              {db.host && (
                <div className="grid grid-cols-2 gap-3 bg-black/30 rounded-xl p-4 border border-white/[0.03] shadow-inner text-[13px]">
                  <div>
                    <span className="text-gray-500 uppercase tracking-wider text-[10px] block mb-1">Host Endpoint</span> 
                    <span className="text-gray-200 font-mono truncate">{db.host}:{db.port}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 uppercase tracking-wider text-[10px] block mb-1">Username</span> 
                    <span className="text-gray-200 font-mono truncate">{db.username}</span>
                  </div>
                  {db.password && (
                    <div className="col-span-2 pt-2 mt-1 border-t border-white/5 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-500 uppercase tracking-wider text-[10px] block mb-1">Password</span>
                        <span className="text-primary font-mono truncate">{showPass[db.id] ? db.password : '••••••••••••••••'}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowPass(p => ({ ...p, [db.id]: !p[db.id] }))} className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center text-gray-400 hover:text-white" title="Toggle Visibility">
                          {showPass[db.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => { navigator.clipboard.writeText(db.password); toast.success('Password COPIED'); }} className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/20 shadow-[0_0_10px_rgba(0,212,255,0.1)]" title="Copy Password">
                          <Copy className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
