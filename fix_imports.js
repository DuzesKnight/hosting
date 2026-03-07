const fs = require('fs');
const file = '/workspaces/hosting/frontend/src/app/dashboard/servers/[id]/page.tsx';
let txt = fs.readFileSync(file, 'utf8');

txt = txt.replace("} from 'lucide-react';", ", Archive, Clock } from 'lucide-react';");
fs.writeFileSync(file, txt);
