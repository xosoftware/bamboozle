"""Build helper for the Vegas Happy Hours PWA.
index.html / app.css / app.js are hand-maintained sources (2026 redesign).
Usage:  python3 tools/build.py [--from-html /path/to/vegas_hh_map_inkind.html]
- --from-html: re-extract data.json from a regenerated single-file map (uses app_src/template.html to locate the data blob).
- Always bumps the service-worker cache version (content hash of the app shell).
"""
import json, re, sys, os, hashlib
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
if '--from-html' in sys.argv:
    tpl = open('app_src/template.html').read()
    src = sys.argv[sys.argv.index('--from-html') + 1]
    t = open(src).read()
    i = tpl.index('__DATA__'); pre, post = tpl[:i], tpl[i+8:]
    # only the data blob matters: locate it between the template's surrounding markers
    a = pre[-200:]; b = post[:200]
    s = t.index(a) + len(a); e = t.index(b, s)
    recs = json.loads(t[s:e].replace('<\\/', '</'))
    json.dump(recs, open('data.json', 'w'), ensure_ascii=False, separators=(',', ':'))
files = ['index.html', 'app.css', 'app.js', 'data.json', 'manifest.webmanifest', 'fonts/inter-latin-wght.woff2'] + sorted('icons/' + f for f in os.listdir('icons'))
hsh = hashlib.sha256(b''.join(open(f, 'rb').read() for f in files)).hexdigest()[:10]
sw = open('sw.js').read()
sw = re.sub(r"const VERSION = '[^']*';", f"const VERSION = 'v2-{hsh}';", sw)
open('sw.js', 'w').write(sw)
print('built; cache version v2-' + hsh, '; venues', len(json.load(open('data.json'))))
