const fs = require('fs');
let file = fs.readFileSync('/workspaces/hosting/frontend/src/app/dashboard/servers/[id]/page.tsx', 'utf8');

const oldHeaderPanel = `<div className="grid grid-cols-1 xl:grid-cols-6 gap-5 mt-4">
        {/* Server Identity Panel */}
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, type: 'spring', bounce: 0.15 }}
          className="xl:col-span-3 neo-card relative overflow-hidden flex flex-col justify-between p-7 sm:p-8 bg-[#09090b]/90"
        >
          {/* Accent top line */}
          <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(161,161,170,0.15) 30%, rgba(161,161,170,0.25) 50%, rgba(161,161,170,0.15) 70%, transparent)' }} />
          
          {/* Soft ambient orbs */}
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-white/[0.03] blur-[90px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-white/[0.02] blur-[90px] rounded-full pointer-events-none" />
          
          <div className="relative z-10">
             <Link href="/dashboard/servers" className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-gray-400 hover:text-white mb-5 transition-all hover:bg-white/[0.08] text-[11px] font-semibold tracking-widest uppercase">
               <ChevronLeft className="w-3.5 h-3.5" /> ALL SERVERS
             </Link>
             <h1 className="text-3xl sm:text-4xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-400 tracking-tight leading-tight truncate mb-3">{server.name}</h1>
             <div className="flex items-center gap-2.5 flex-wrap">
               <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full font-bold tracking-widest text-[11px]" style={{ background: sc.bg, border: \`1px solid \${sc.border}\` }}>
                 <span className="relative flex h-2 w-2">
                   {status === 'running' && <span className={\`absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping \${sc.dot}\`} />}
                   <span className={\`relative inline-flex w-2 h-2 rounded-full \${sc.dot} shadow-[0_0_10px_currentColor]\`} />
                 </span>
                 <span className={sc.text}>{status.toUpperCase()}</span>
               </span>
               <span className="px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.05] text-[10px] font-mono text-gray-500 tracking-widest">{server.id}</span>
             </div>

             {/* Server Connection Address */}
             {serverAddress && (
               <motion.div 
                 initial={{ opacity: 0, y: 4 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.2, duration: 0.4 }}
                 className="mt-5"
               >
                 <span className="text-[9px] text-gray-500 tracking-[0.2em] uppercase font-semibold mb-2 block">CONNECTION ADDRESS</span>
                 <div className="inline-flex items-center gap-2 pl-4 pr-1.5 py-2 rounded-xl bg-black/40 border border-white/[0.07] hover:border-white/[0.15] transition-all group">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
                   <span className="font-mono text-[14px] font-bold text-white tracking-wider select-all">{serverAddress}</span>
                   <motion.button
                     whileHover={{ scale: 1.1 }}
                     whileTap={{ scale: 0.9 }}
                     onClick={() => { navigator.clipboard.writeText(serverAddress); toast.success('Server address copied!'); }}
                     className="ml-1 w-7 h-7 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-gray-400 hover:bg-white/[0.12] hover:border-white/[0.15] hover:text-white transition-all"
                     title="Copy server address"
                   >
                     <Copy className="w-3 h-3" />
                   </motion.button>
                 </div>
               </motion.div>
             )}
          </div>

          {/* Power Controls */}
          <div className="mt-7 flex items-center gap-2 sm:gap-2.5 relative z-10 flex-wrap">
            <div className="flex items-center gap-1 bg-black/40 p-1.5 rounded-xl border border-white/[0.05]">
            {[
              { signal: 'start', icon: Play, text: 'START', color: 'text-emerald-400', bg: 'rgba(16,185,129,0.08)', disabled: status === 'running', glow: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.25)' },
              { signal: 'stop', icon: Square, text: 'STOP', color: 'text-red-400', bg: 'rgba(239,68,68,0.08)', disabled: status === 'offline', glow: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.25)' },
              { signal: 'restart', icon: RotateCcw, text: 'REBOOT', color: 'text-amber-400', bg: 'rgba(234,179,8,0.08)', disabled: status === 'offline', glow: 'rgba(234,179,8,0.15)', border: 'rgba(234,179,8,0.25)' },
              { signal: 'kill', icon: Skull, text: 'KILL', color: 'text-red-500', bg: 'rgba(239,68,68,0.08)', disabled: status === 'offline', glow: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.25)' },
            ].map(p => (
              <motion.button 
                key={p.signal} 
                onClick={() => handlePower(p.signal)} 
                disabled={powerLoading || p.disabled || isSuspended}
                whileHover={{ y: -1, scale: 1.04 }}
                whileTap={{ y: 0, scale: 0.95 }}
                className={\`group relative flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all disabled:opacity-20 disabled:cursor-not-allowed \${p.color}\`}
                style={{ background: p.bg }}
                title={p.signal}>
                <p.icon className="w-3.5 h-3.5 relative z-10" />
                <span className="text-[10px] font-bold tracking-widest relative z-10 hidden sm:inline">{p.text}</span>
              </motion.button>
            ))}
            </div>
            <motion.button 
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setDeleteConfirm(true)} 
              className="w-9 h-9 rounded-lg flex items-center justify-center text-red-500/60 bg-red-500/5 border border-red-500/10 hover:bg-red-500/15 hover:border-red-500/25 hover:text-red-400 transition-all" 
              title="Delete Server">
              <Trash2 className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </motion.div>`;

const newHeaderPanel = `<div className="grid grid-cols-1 xl:grid-cols-6 gap-6 mt-4 perspective-[2000px]">
        {/* Server Identity Panel */}
        <motion.div 
          initial={{ opacity: 0, y: 30, rotateX: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
          transition={{ duration: 0.8, type: 'spring', bounce: 0.3 }}
          className="xl:col-span-3 neo-card relative overflow-hidden flex flex-col justify-between p-8 sm:p-10 bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/[0.08]"
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Holographic light gradients */}
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-sky-500/10 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="relative z-10" style={{ transform: 'translateZ(30px)' }}>
             <Link href="/dashboard/servers" className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.1] shadow-inner text-gray-400 hover:text-white mb-6 transition-all hover:bg-white/[0.1] hover:scale-105 text-[11px] font-bold tracking-[0.2em] uppercase">
               <ChevronLeft className="w-3.5 h-3.5" /> Back to Fleet
             </Link>

             <motion.h1 
               layoutId={\`server-title-\${server.id}\`}
               className="text-4xl sm:text-5xl font-display font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-gray-100 to-gray-500 tracking-tight leading-tight shrink-0 mb-4 drop-shadow-[0_2px_10px_rgba(255,255,255,0.1)]"
             >
               {server.name}
             </motion.h1>

             <div className="flex items-center gap-3 flex-wrap">
               <motion.span 
                 whileHover={{ scale: 1.05 }}
                 className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-black tracking-[0.2em] text-[11px] uppercase shadow-lg backdrop-blur-md" 
                 style={{ background: sc.bg, border: \`1px solid \${sc.border}\`, boxShadow: \`0 0 20px \${sc.bg.replace('0.08', '0.2')}\` }}
               >
                 <span className="relative flex h-2.5 w-2.5">
                   {status === 'running' && <span className={\`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping \${sc.dot}\`} />}
                   <span className={\`relative inline-flex w-2.5 h-2.5 rounded-full \${sc.dot} shadow-[0_0_12px_currentColor]\`} />
                 </span>
                 <span className={sc.text}>{status}</span>
               </motion.span>

               <span className="px-3.5 py-2 rounded-full bg-black/40 border border-white/[0.06] text-[11px] font-mono font-bold text-gray-400 tracking-widest shadow-inner">
                 ID: <span className="text-gray-300">{server.id}</span>
               </span>
             </div>

             {/* Connection Address Box */}
             {serverAddress && (
               <motion.div 
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.3, duration: 0.5 }}
                 className="mt-8"
               >
                 <span className="text-[10px] text-gray-500 tracking-[0.25em] uppercase font-black mb-3 block drop-shadow-md">CONNECT TO NODE</span>
                 <div className="inline-flex items-center gap-3 pl-5 pr-2 py-2.5 rounded-2xl bg-black/60 border border-white/[0.1] hover:border-white/[0.2] transition-colors shadow-inner group backdrop-blur-xl">
                   <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                   <span className="font-mono text-[16px] font-black text-white tracking-widest select-all drop-shadow-sm">{serverAddress}</span>
                   <motion.button
                     whileHover={{ scale: 1.1, rotate: 5 }}
                     whileTap={{ scale: 0.9 }}
                     onClick={() => { navigator.clipboard.writeText(serverAddress); toast.success('Address Copied!'); }}
                     className="ml-2 w-10 h-10 rounded-xl bg-white/[0.08] border border-white/[0.1] flex items-center justify-center text-gray-300 hover:bg-white/[0.15] hover:text-white transition-all shadow-[0_4px_10px_rgba(0,0,0,0.3)]"
                     title="Copy Address"
                   >
                     <Copy className="w-4 h-4" />
                   </motion.button>
                 </div>
               </motion.div>
             )}
          </div>

          {/* Holographic Power Controls */}
          <div className="mt-10 flex items-center gap-3 relative z-10 flex-wrap" style={{ transform: 'translateZ(40px)' }}>
            <div className="flex items-center gap-2 bg-black/50 p-2 rounded-2xl border border-white/[0.08] backdrop-blur-md shadow-2xl">
            {[
              { signal: 'start', icon: Play, text: 'IGNITE', color: 'text-emerald-400', bg: 'rgba(16,185,129,0.1)', disabled: status === 'running', shadow: 'rgba(16,185,129,0.3)' },
              { signal: 'stop', icon: Square, text: 'HALT', color: 'text-red-400', bg: 'rgba(239,68,68,0.1)', disabled: status === 'offline', shadow: 'rgba(239,68,68,0.3)' },
              { signal: 'restart', icon: RotateCcw, text: 'REBOOT', color: 'text-amber-400', bg: 'rgba(245,158,11,0.1)', disabled: status === 'offline', shadow: 'rgba(245,158,11,0.3)' },
              { signal: 'kill', icon: Skull, text: 'TERMINATE', color: 'text-red-500', bg: 'rgba(239,68,68,0.1)', disabled: status === 'offline', shadow: 'rgba(239,68,68,0.4)' },
            ].map(p => (
              <motion.button 
                key={p.signal} 
                onClick={() => handlePower(p.signal)} 
                disabled={powerLoading || p.disabled || isSuspended}
                whileHover={{ y: -3, scale: 1.05, boxShadow: \`0 10px 20px -5px \${p.shadow}\` }}
                whileTap={{ y: 0, scale: 0.95 }}
                className={\`relative flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed \${p.color}\`}
                style={{ background: p.bg, border: \`1px solid \${p.bg.replace('0.1', '0.2')}\` }}
                title={p.signal}
              >
                <p.icon className="w-4 h-4" />
                <span className="text-[11px] font-black tracking-[0.15em] hidden sm:inline">{p.text}</span>
              </motion.button>
            ))}
            </div>

            <motion.button 
              whileHover={{ scale: 1.1, rotate: 10 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setDeleteConfirm(true)} 
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-red-500 bg-black/50 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40 transition-all shadow-lg backdrop-blur-md" 
              title="Destroy Node"
            >
              <Trash2 className="w-5 h-5" />
            </motion.button>
          </div>
        </motion.div>`;

file = file.replace(oldHeaderPanel, newHeaderPanel);
fs.writeFileSync('/workspaces/hosting/frontend/src/app/dashboard/servers/[id]/page.tsx', file);
