const fs = require('fs');
let txt = fs.readFileSync('restart.sh', 'utf8');

txt = txt.replace(/if ! if \[ "\$NO_CACHE" = true \]; then\n    \$COMPOSE build --no-cache >> "\$BUILD_LOG" 2>&1 \|\| fail "docker compose build --no-cache failed"\n  elif \[ -n "\$BUILD_FLAGS" \]; then\n    \$COMPOSE build >> "\$BUILD_LOG" 2>&1 \|\| fail "docker compose build failed"\n  fi\n  if ! \$COMPOSE up -d >> "\$BUILD_LOG" 2>&1 >> "\$BUILD_LOG" 2>&1; then/g, 
\`if [ "\$NO_CACHE" = true ]; then
    \$COMPOSE build --no-cache >> "\$BUILD_LOG" 2>&1 || fail "docker compose build --no-cache failed"
  elif [ -n "\$BUILD_FLAGS" ]; then
    \$COMPOSE build >> "\$BUILD_LOG" 2>&1 || fail "docker compose build failed"
  fi
  if ! \$COMPOSE up -d >> "\$BUILD_LOG" 2>&1; then\`
);
fs.writeFileSync('restart.sh', txt);
