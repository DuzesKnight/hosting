const fs = require('fs');
const file = '/workspaces/hosting/frontend/src/app/dashboard/servers/[id]/page.tsx';
let txt = fs.readFileSync(file, 'utf8');

const regex = /\/\*\s*────────\s*SETTINGS TAB\s*────────\s*\*\/[\s\S]*?(?=$)/m;

const replacement = `/* ──────── SETTINGS TAB ──────── */
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
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Rename Box */}
      <div className="neo-card relative overflow-hidden p-6 md:p-8 bg-gradient-to-br from-[#09090b]/80 to-[#101018]/80 group">
        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/20 blur-[50px] rounded-full pointer-events-none group-hover:bg-primary/30 transition-colors duration-500" />
        
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <h3 className="text-lg font-display font-semibold text-white flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_10px_rgba(0,212,255,0.1)]">
                <Edit3 className="w-4 h-4 text-primary" /> 
              </div>
              Rename Server
            </h3>
            <p className="text-sm text-gray-400 mt-2 leading-relaxed">Update the display name of your server on the control panel.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="input-field text-sm flex-1 bg-black/40 border-white/[0.08] focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all shadow-inner h-11 px-4" 
              placeholder="Enter new server name..." 
            />
            <motion.button 
              whileHover={{ scale: (name !== serverName && !saving) ? 1.05 : 1 }} 
              whileTap={{ scale: (name !== serverName && !saving) ? 0.95 : 1 }} 
              onClick={handleRename} 
              disabled={saving || name === serverName} 
              className="h-11 px-6 rounded-xl font-bold tracking-wide text-xs transition-all flex items-center justify-center gap-2 min-w-[100px] disabled:opacity-50 disabled:cursor-not-allowed bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 hover:border-primary/50 hover:shadow-[0_0_15px_rgba(0,212,255,0.3)]"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>SAVE <ChevronRight className="w-3 h-3" /></>}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="neo-card relative overflow-hidden p-6 md:p-8 border border-red-500/20 bg-gradient-to-br from-red-950/10 to-red-900/5 group">
        <svg className="absolute inset-0 w-full h-full opacity-[0.02] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="danger-stripes" width="40" height="40" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="40" stroke="currentColor" strokeWidth="20" strokeLinecap="square" className="text-red-500" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#danger-stripes)" />
        </svg>
        
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-500/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-red-500/20 transition-colors duration-700" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h3 className="text-lg font-display font-bold text-red-400 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                <AlertTriangle className="w-4 h-4 text-red-500" /> 
              </div>
              DANGER ZONE: Reinstall Server
            </h3>
            <p className="text-sm text-gray-400 mt-2 max-w-xl leading-relaxed">
              This action will forcefully stop the server, erase <span className="text-white font-bold">ALL</span> files and directories, and attempt to unpack the base template over the existing instance. This is an irreversible, destructive task.
            </p>
          </div>
          
          <motion.button 
            whileHover={{ scale: !reinstalling ? 1.05 : 1 }} 
            whileTap={{ scale: !reinstalling ? 0.95 : 1 }} 
            onClick={handleReinstall} 
            disabled={reinstalling} 
            className="h-11 px-6 rounded-xl font-bold tracking-widest text-xs transition-all flex items-center justify-center gap-2 min-w-[200px] bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] whitespace-nowrap"
          >
            {reinstalling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'INITIATE REINSTALL'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
`;

txt = txt.replace(regex, replacement);
fs.writeFileSync(file, txt);
