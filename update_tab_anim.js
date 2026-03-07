const fs = require('fs');
let file = fs.readFileSync('/workspaces/hosting/frontend/src/app/dashboard/servers/[id]/page.tsx', 'utf8');

const oldAnim = `<AnimatePresence mode="wait">
        <motion.div 
          key={tab} 
          initial={{ opacity: 0, y: 15, scale: 0.98, filter: 'blur(4px)' }} 
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }} 
          exit={{ opacity: 0, y: -15, scale: 0.98, filter: 'blur(4px)' }} 
          transition={{ duration: 0.4, type: "spring", bounce: 0.2 }}
          className="mt-6"
        >`;

const newAnim = `<AnimatePresence mode="wait">
        <motion.div 
          key={tab} 
          initial={{ opacity: 0, y: 30, scale: 0.95, filter: 'blur(8px)', rotateX: -10 }} 
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', rotateX: 0 }} 
          exit={{ opacity: 0, y: -30, scale: 1.05, filter: 'blur(8px)', rotateX: 10 }} 
          transition={{ duration: 0.6, type: "spring", bounce: 0.3 }}
          className="mt-6 perspective-[1000px] transform-style-[preserve-3d]"
        >`;

file = file.replace(oldAnim, newAnim);
fs.writeFileSync('/workspaces/hosting/frontend/src/app/dashboard/servers/[id]/page.tsx', file);
