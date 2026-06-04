#!/usr/bin/env bash
set -e
export PATH=$PATH:/root/.local/bin
cd /root/evidence

echo "=== fetch a real Windows memory sample (cridex) ==="
if [ ! -f memory.raw ]; then
  # classic public Volatility training image: real malware (reader_sl.exe) + C2
  for url in \
    "https://github.com/volatilityfoundation/volatility/wiki" \
    "http://files.sempersecurus.org/dumps/cridex_memdump.zip" \
    "https://archive.org/download/cridex/cridex.vmem"; do
    echo "trying $url"
    code=$(curl -sS -L -o /tmp/mem.bin -w "%{http_code}" "$url" 2>/dev/null || echo 000)
    sz=$(stat -c%s /tmp/mem.bin 2>/dev/null || echo 0)
    echo "  -> $code  $sz bytes"
    if [ "$sz" -gt 1000000 ]; then
      case "$url" in
        *.zip) unzip -o -q /tmp/mem.bin -d /root/evidence && mv $(ls -S /root/evidence/*.vmem /root/evidence/*.mem 2>/dev/null | head -1) memory.raw ;;
        *) mv /tmp/mem.bin memory.raw ;;
      esac
      break
    fi
  done
fi
ls -la /root/evidence/memory.raw 2>/dev/null || echo "no memory image yet"

if [ -f memory.raw ]; then
  echo "=== real vol windows.pslist (first run, builds symbols — may take a minute) ==="
  vol -f /root/evidence/memory.raw -r json windows.pslist 2>/tmp/vol.err | head -c 1500
  echo
  echo "=== stderr tail ==="; tail -3 /tmp/vol.err
fi
