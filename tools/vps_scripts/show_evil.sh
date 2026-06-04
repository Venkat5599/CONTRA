f=$(ls /root/evidence/out/*.json | head -1)
echo "=== evil.exe record ==="
grep -i "evil.exe" "$f" | python3 -m json.tool 2>/dev/null || grep -i "evil" "$f"
echo "=== all filenames + timestomp flag ==="
python3 -c "
import json,sys
for line in open('$f'):
    line=line.strip()
    if not line: continue
    r=json.loads(line)
    if r.get('FileName','').lower() in ('evil.exe','report.txt'):
        print(r['FileName'], '| SI_created=', r.get('Created0x10'), '| FN_created=', r.get('Created0x30'), '| Timestomped=', r.get('Timestomped'))
"
