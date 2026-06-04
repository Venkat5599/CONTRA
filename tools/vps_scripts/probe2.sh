echo "=== dotnet ==="; dotnet --list-runtimes 2>&1 | head -3 || echo "no dotnet"
echo "=== test EZ urls ==="
for url in \
  "https://download.mikestammer.com/net9/MFTECmd.zip" \
  "https://f000.backblazeb2.com/file/EricZimmermanTools/net9/MFTECmd.zip" \
  "https://f001.backblazeb2.com/file/EricZimmermanTools/net9/MFTECmd.zip"; do
  code=$(curl -sS -o /tmp/t.zip -w "%{http_code}" -L "$url" 2>/dev/null)
  sz=$(stat -c%s /tmp/t.zip 2>/dev/null || echo 0)
  echo "$code  size=$sz  $url"
done
