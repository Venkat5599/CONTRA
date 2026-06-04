export PATH=$PATH:/root/.local/bin
cd /root/evidence
for url in \
  "https://archive.org/download/Africa_DFIRCTF/cridex.vmem" \
  "https://github.com/stuxnet999/MemLabs/raw/master/Lab%201/README.md" \
  "https://samples.vx-underground.org/root/Samples/cridex.vmem" \
  "https://downloads.volatilityfoundation.org/releases/cridex.vmem"; do
  code=$(curl -sS -L -o /tmp/m.bin -w "%{http_code}" --max-time 120 "$url" 2>/dev/null || echo 000)
  sz=$(stat -c%s /tmp/m.bin 2>/dev/null || echo 0)
  echo "$code  ${sz}b  $url"
  [ "$sz" -gt 5000000 ] && { mv /tmp/m.bin memory.raw; echo "GOT IT"; break; }
done
ls -la memory.raw 2>/dev/null || echo "still none"
