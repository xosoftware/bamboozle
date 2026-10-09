"""Build helper for the BamBoozle PWA.
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
def _bytes(f):
    data = open(f, 'rb').read()
    # Ignore the cache-bust query we rewrite below so VERSION stays stable across rebuilds.
    if f == 'index.html':
        data = re.sub(br'(href="manifest\.webmanifest)(?:\?v=[^"]*)?(")', br'\1\2', data)
    return data
hsh = hashlib.sha256(b''.join(_bytes(f) for f in files)).hexdigest()[:10]
sw = open('sw.js').read()
sw = re.sub(r"const VERSION = '[^']*';", f"const VERSION = 'v2-{hsh}';", sw)
open('sw.js', 'w').write(sw)
idx = open('index.html').read()
idx2, n = re.subn(r'(href="manifest\.webmanifest)(?:\?v=[^"]*)?(")', r'\1?v=' + hsh + r'\2', idx, count=1)
if n != 1:
    raise SystemExit('expected one manifest link in index.html, found %d' % n)
open('index.html', 'w').write(idx2)
print('built; cache version v2-' + hsh, '; manifest ?v=' + hsh, '; venues', len(json.load(open('data.json'))))
