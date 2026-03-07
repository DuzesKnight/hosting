const fs = require('fs');
let file = fs.readFileSync('/workspaces/hosting/frontend/src/app/dashboard/servers/[id]/page.tsx', 'utf8');

const oldTabs = `<div className="relative mt-3">
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none p-1 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={\`relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium whitespace-nowrap transition-all duration-300 \${
                tab === t.id ? 'text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
              }\`}>
              {tab === t.id && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 rounded-lg bg-white/[0.06] border border-white/[0.08]"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                />
              )}
              <t.icon className={\`w-4 h-4 relative z-10 transition-colors duration-300 \${tab === t.id ? 'text-white' : ''}\`} />
              <span className="relative z-10 tracking-wide">{t.label}</span>
            </button>
          ))}
        </div>
      </div>`;

const newTabs = `<div className="relative mt-8 z-20">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none p-2 rounded-2xl bg-black/40 border border-white/[0.05] backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          {tabs.map(t => (
            <button 
              key={t.id} onClick={() => setTab(t.id)}
              className={\`relative flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl text-[12px] font-bold uppercase tracking-widest whitespace-nowrap transition-all duration-500 \${
                tab === t.id ? 'text-white scale-100' : 'text-gray-500 hover:text-white hover:bg-white/[0.05] scale-95 hover:scale-100'
              }\`}
            >
              {tab === t.id && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/[0.1] to-white/[0.02] border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                  transition={{ type: 'spring', bounce: 0.3, duration: 0.6 }}
                />
              )}
              <t.icon className={\`w-4 h-4 relative z-10 transition-all duration-500 \${tab === t.id ? 'text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]' : 'opacity-70'}\`} />
              <span className="relative z-10 drop-shadow-sm">{t.label}</span>
            </button>
          ))}
        </div>
      </div>`;

file = file.replace(oldTabs, newTabs);
fs.writeFileSync('/workspaces/hosting/frontend/src/app/dashboard/servers/[id]/page.tsx', file);
