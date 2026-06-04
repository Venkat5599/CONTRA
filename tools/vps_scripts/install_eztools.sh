#!/usr/bin/env bash
set -e
export DEBIAN_FRONTEND=noninteractive

echo "=== install .NET runtime ==="
if ! command -v dotnet >/dev/null 2>&1; then
  curl -sSL https://dot.net/v1/dotnet-install.sh -o /tmp/dotnet-install.sh
  bash /tmp/dotnet-install.sh --channel 9.0 --runtime dotnet --install-dir /opt/dotnet
  ln -sf /opt/dotnet/dotnet /usr/local/bin/dotnet
fi
dotnet --list-runtimes 2>&1 | head -3

echo "=== download Eric Zimmerman tools (net9) ==="
mkdir -p /opt/eztools && cd /opt/eztools
for t in MFTECmd PECmd AmcacheParser SrumECmd RECmd; do
  if [ ! -f "/opt/eztools/$t/${t}.dll" ]; then
    curl -sSL "https://download.mikestammer.com/net9/${t}.zip" -o "/tmp/${t}.zip"
    unzip -o -q "/tmp/${t}.zip" -d "/opt/eztools/$t" || echo "unzip $t failed"
  fi
done
ls -1 /opt/eztools

echo "=== wrapper shims in /usr/local/bin ==="
for t in MFTECmd PECmd AmcacheParser SrumECmd RECmd; do
  dll=$(find /opt/eztools/$t -name "${t}.dll" 2>/dev/null | head -1)
  if [ -n "$dll" ]; then
    printf '#!/usr/bin/env bash\nexec dotnet "%s" "$@"\n' "$dll" > "/usr/local/bin/$t"
    chmod +x "/usr/local/bin/$t"
    echo "shim: $t -> $dll"
  else
    echo "MISSING dll for $t"
  fi
done

echo "=== verify ==="
MFTECmd --help 2>&1 | head -3 || echo "MFTECmd failed"
