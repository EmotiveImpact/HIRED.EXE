"""Package source, art and history, plus the two generated offline editions."""
from pathlib import Path
import hashlib
import json
import shutil
import zipfile

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT.parent/'deliverables'
OUT.mkdir(exist_ok=True)
archive=OUT/'HIRED-EXE-v0.4-PROJECT.zip'
excluded={'dist','release','.git','node_modules','__pycache__'}
files=[]
for p in sorted(ROOT.rglob('*')):
    rel=p.relative_to(ROOT)
    if p.is_file() and not any(part in excluded for part in rel.parts) and p.suffix!='.pyc':
        files.append((p,rel))
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for p,rel in files:
        z.write(p,'HIRED-EXE-v0.4/'+str(rel))
for name in ['HIRED-EXE-v0.4-PLAY.html','HIRED-EXE-v0.4-ART-BOOK.html']:
    source=ROOT/'dist'/name
    if not source.is_file():
        raise SystemExit('Run python3 tools/build.py before packaging.')
    shutil.copy2(source,OUT/name)
checks=[]
for p in sorted(OUT.iterdir()):
    if p.is_file() and p.name!='SHA256SUMS.json':
        checks.append({'file':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(OUT/'SHA256SUMS.json').write_text(json.dumps(checks,indent=2)+'\n')
with zipfile.ZipFile(archive) as z:
    bad=z.testzip()
    if bad: raise SystemExit('ZIP integrity failure: '+bad)
print(f'Source archive: {len(files)} files, {archive.stat().st_size/1048576:.1f} MiB; ZIP integrity passed.')
for item in checks:
    print(f"{item['file']}: {item['bytes']/1048576:.1f} MiB")
