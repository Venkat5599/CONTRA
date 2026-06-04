#!/usr/bin/env bash
set -e
export DEBIAN_FRONTEND=noninteractive
export PATH=$PATH:/root/.local/bin

echo "=== install image tooling ==="
apt-get install -y -qq ntfs-3g sleuthkit >/dev/null 2>&1
echo "ok"

mkdir -p /root/evidence && cd /root/evidence

echo "=== build a real NTFS image with a planted file ==="
if [ ! -f case.ntfs ]; then
  dd if=/dev/zero of=case.raw bs=1M count=64 status=none
  mkfs.ntfs -F -q -L CONTRA case.raw >/dev/null 2>&1
  mkdir -p mnt
  mount -o loop,rw case.raw mnt
  mkdir -p "mnt/Windows/Temp"
  # plant an "evil" binary with an OLD content mtime (the trivially-forgeable side)
  printf 'MZ\x90\x00 fake pe for forensic test' > "mnt/Windows/Temp/evil.exe"
  touch -t 201903120814.02 "mnt/Windows/Temp/evil.exe"   # backdated $SI/content
  printf 'normal report' > "mnt/Windows/Temp/report.txt"
  sync
  umount mnt
  mv case.raw case.ntfs
fi
ls -la /root/evidence/case.ntfs

echo "=== extract real \$MFT with sleuthkit (inode 0) ==="
icat case.ntfs 0 > '/root/evidence/$MFT'
ls -la '/root/evidence/$MFT'

echo "=== run REAL MFTECmd --> json ==="
mkdir -p /root/evidence/out
MFTECmd -f '/root/evidence/$MFT' --json /root/evidence/out 2>&1 | tail -6
echo "=== json files produced ==="
ls -la /root/evidence/out/
echo "=== sample record (first 1200 bytes of json) ==="
f=$(ls /root/evidence/out/*.json | head -1)
head -c 1200 "$f"
echo
