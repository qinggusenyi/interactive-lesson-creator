"""Build a standalone lesson. Python 3.9+, standard library only."""
import argparse
import base64
import copy
import json
import math
import re
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIMES = {'.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg'}

def require(value, message):
    if not value:
        raise ValueError(message)

def validate(lesson):
    for field in ('title','grade','goal','task'):
        require(isinstance(lesson.get(field),str) and lesson[field].strip(),f'Missing text: {field}')
    require(isinstance(lesson.get('source'),dict) and isinstance(lesson['source'].get('label'),str),'source.label required')
    require(isinstance(lesson.get('scenes'),list) and lesson['scenes'],'At least one scene required')
    categories=lesson.get('categories',[])
    require(isinstance(categories,list) and all(isinstance(x,str) and x for x in categories),'categories must contain text')
    scene_ids=set()
    for s in lesson['scenes']:
        require(re.fullmatch(r'[a-z][a-z0-9-]*',s.get('id','')) and s['id'] not in scene_ids,'Scene id invalid or duplicated')
        scene_ids.add(s['id'])
        for field in ('title','image','alt','note'):
            require(isinstance(s.get(field),str) and s[field],f'{s["id"]}: {field} required')
        require(s.get('mode') in ('plane','panorama'),'mode must be plane or panorama')
        if 'startYaw' in s: require(number(s['startYaw']) and -180<=s['startYaw']<=180,'startYaw out of range')
        if 'startPitch' in s: require(number(s['startPitch']) and -50<=s['startPitch']<=50,'startPitch out of range')
        require(isinstance(s.get('hotspots'),list) and s['hotspots'],'Each scene needs a teaching hotspot')
        ids=set()
        for h in s['hotspots']:
            require(re.fullmatch(r'[a-z][a-z0-9-]*',h.get('id','')) and h['id'] not in ids,'Hotspot id invalid or duplicated')
            ids.add(h['id'])
            for f in ('label','quote','question','analysis'):
                require(isinstance(h.get(f),str) and h[f].strip(),f'{h["id"]}: {f} required')
            fields=(('x',0,100),('y',0,100)) if s['mode']=='plane' else (('yaw',-180,180),('pitch',-85,85))
            for f,lo,hi in fields:require(number(h.get(f)) and lo<=h[f]<=hi,f'{h["id"]}: {f} out of range')
            if 'challenge' in h:
                c=h['challenge'];require(isinstance(c,dict) and isinstance(c.get('prompt'),str) and c['prompt'],'challenge.prompt required')
                choices=c.get('choices');require(isinstance(choices,list) and len(choices)>=2,'Need two choices')
                for choice in choices:
                    require(isinstance(choice.get('label'),str) and choice['label'] and isinstance(choice.get('feedback'),str) and choice['feedback'] and isinstance(choice.get('correct'),bool),'Choice label, boolean correct, feedback required')
                require(any(x['correct'] for x in choices),'At least one supported choice required')
    return lesson

def number(x):
    return isinstance(x,(int,float)) and not isinstance(x,bool) and math.isfinite(x)

def check_svg(raw):
    root=ET.fromstring(raw)
    require(root.tag.rsplit('}',1)[-1]=='svg','Expected SVG root')
    for e in root.iter():
        require(e.tag.rsplit('}',1)[-1] not in ('script','foreignObject','style','animate','set','animateTransform'),'Unsupported active SVG element')
        for k,v in e.attrib.items():
            name=k.rsplit('}',1)[-1].lower()
            require(not name.startswith('on'),'SVG event handler not allowed')
            require(not (name in ('href','src') and not v.startswith('#')),'SVG external reference not allowed')
            for url in re.findall(r'url\((.*?)\)',v,re.I):
                require(url.strip(' \"\'').startswith('#'),'SVG external CSS url not allowed')
    require(b'<!DOCTYPE' not in raw.upper() and b'<!ENTITY' not in raw.upper(),'SVG entities not allowed')

def resource(path, base, kind):
    require(isinstance(path,str) and not re.match(r'^[a-z][a-z0-9+.-]*:',path,re.I),'Use local relative resources')
    p=(base/path).resolve()
    require(p.is_relative_to(base.resolve()),'Resource escapes lesson directory')
    require(p.is_file(),f'Resource not found: {path}')
    mime=MIMES.get(p.suffix.lower(),'')
    require(mime.startswith(kind+'/'),f'Unsupported {kind}: {path}')
    raw=p.read_bytes();require(0<len(raw)<30*1024*1024,'Asset empty or larger than 30MB')
    if mime=='image/svg+xml':check_svg(raw)
    return f'data:{mime};base64,'+base64.b64encode(raw).decode('ascii')

def build(config, output):
    config=Path(config);data=copy.deepcopy(validate(json.loads(config.read_text(encoding='utf-8'))))
    for s in data['scenes']:
        s['image']=resource(s['image'],config.parent,'image')
        for h in s['hotspots']:
            for field in ('audio','audioSlow'):
                if field in h:h[field]=resource(h[field],config.parent,'audio')
    html=(ROOT/'assets/lesson.html').read_text(encoding='utf-8')
    html=html.replace('/*__STYLE__*/',(ROOT/'assets/lesson.css').read_text(encoding='utf-8'))
    html=html.replace('/*__RUNTIME__*/',(ROOT/'assets/runtime.js').read_text(encoding='utf-8'))
    html=html.replace('__LESSON_JSON__',json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c'))
    require(len(html.encode())<=40*1024*1024,'Single file exceeds 40MB; optimize source assets')
    output=Path(output);output.parent.mkdir(parents=True,exist_ok=True);output.write_text(html,encoding='utf-8')
    return output

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('config',type=Path);p.add_argument('--out',type=Path,required=True);args=p.parse_args()
    try:
        out=build(args.config,args.out);print(f'Built {out.name}: {out.stat().st_size:,} bytes')
    except (ValueError,OSError,ET.ParseError) as error:
        p.exit(1,f'Build failed: {error}\n')
