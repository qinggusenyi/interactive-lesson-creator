"""Static offline/package checks. Does not certify browser interaction."""
import argparse
import base64
import json
import re
import shutil
import subprocess
import tempfile
from html.parser import HTMLParser
from pathlib import Path
from build import check_svg, validate

class Inspector(HTMLParser):
    def __init__(self):
        super().__init__();self.ids=[];self.scripts=[];self.current=None;self.data='';self.errors=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        for k in ('src','poster'):
            if k in a and not a[k].startswith('data:'):self.errors.append(f'External runtime asset: {tag}.{k}')
        if tag=='link':self.errors.append('External link element')
        if tag in ('iframe','object','embed','base'):self.errors.append('Unsupported embedded runtime element: '+tag)
        if tag=='script':self.current=a;self.data=''
    def handle_data(self,data):
        if self.current is not None:self.data+=data
    def handle_endtag(self,tag):
        if tag=='script' and self.current is not None:self.scripts.append((self.current,self.data));self.current=None

def verify(path):
    text=Path(path).read_text(encoding='utf-8');scan=Inspector();scan.feed(text);errors=scan.errors
    if len(scan.ids)!=len(set(scan.ids)):errors.append('Duplicate DOM ids')
    if re.search(r'__(?:LESSON|STYLE|RUNTIME|IMG)_',text):errors.append('Unexpanded placeholder')
    configs=[s for a,s in scan.scripts if a.get('id')=='lesson-data']
    if len(configs)!=1:raise ValueError('Expected one lesson-data script')
    data=json.loads(configs[0]);validate(data)
    images=0
    for s in data['scenes']:
        for field,value in [('image',s['image'])]+[('art',h['art']) for h in s['hotspots']]:
            if not value.startswith('data:'):errors.append('Resource not embedded: '+field);continue
            head,encoded=value.split(',',1);raw=base64.b64decode(encoded,validate=True)
            images+=1
            if 'svg+xml' in head:check_svg(raw)
            elif not (raw.startswith(b'\x89PNG\r\n\x1a\n') or raw.startswith(b'\xff\xd8') or (raw.startswith(b'RIFF') and raw[8:12]==b'WEBP')):errors.append('Unknown image header')
    css=''.join(re.findall(r'<style>(.*?)</style>',text,re.S))
    if len(css)<1000 or not all(selector in css for selector in (':root{','.screen{','.detail{','.point{')):errors.append('Core stylesheet missing')
    if re.search(r'@import|url\(\s*["\']?(?!data:|#)',css,re.I):errors.append('CSS external dependency')
    runtime=[s for a,s in scan.scripts if a.get('type')!='application/json']
    if any(re.search(r'\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|importScripts)\s*\(',s) for s in runtime):errors.append('Unexpected network API in runtime')
    node=shutil.which('node');syntax='SKIP: Node not installed'
    if node:
        with tempfile.TemporaryDirectory() as tmp:
            script=Path(tmp)/'runtime.js';script.write_text('\n'.join(runtime),encoding='utf-8')
            check=subprocess.run([node,'--check',str(script)],capture_output=True,text=True,encoding='utf-8')
            if check.returncode:errors.append('JavaScript syntax: '+check.stderr)
            syntax='PASS' if check.returncode==0 else 'FAIL'
    return {'file':Path(path).name,'static':'PASS' if not errors else 'FAIL','javascript_syntax':syntax,'scenes':len(data['scenes']),'hotspots':sum(len(s['hotspots']) for s in data['scenes']),'embedded_images':images,'errors':errors,'browser_interaction':'NOT TESTED by this script'}

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('html',type=Path);args=parser.parse_args()
    try:
        result=verify(args.html);print(json.dumps(result,ensure_ascii=False,indent=2));raise SystemExit(bool(result['errors']))
    except (ValueError,OSError) as error:parser.exit(1,f'Check failed: {error}\n')
