"""Small regression check for standalone output and unsafe resource rejection."""
import copy
import json
import sys
import tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from build import build, check_svg, resource, validate
from verify import verify

def rejects(fn):
    try:fn()
    except (ValueError,OSError):return
    raise AssertionError('Expected rejection')

data=json.loads((ROOT/'examples/xiaoshitan/lesson.json').read_text(encoding='utf-8'))
bad=copy.deepcopy(data);bad['scenes'].append(bad['scenes'][0]);rejects(lambda:validate(bad))
bad=copy.deepcopy(data);bad['scenes'][0]['hotspots'][0]['yaw']=181;rejects(lambda:validate(bad))
bad=copy.deepcopy(data);bad['scenes'][0]['hotspots'][1]['art']=bad['scenes'][0]['hotspots'][0]['art'];rejects(lambda:validate(bad))
for svg in [b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',b'<svg onload="alert(1)"/>',b'<svg><image href="https://example.test/p.png"/></svg>']:
    rejects(lambda:check_svg(svg))
with tempfile.TemporaryDirectory() as tmp:
    p=Path(tmp);(p/'ok.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><path d="M0 0h10v10H0" fill="#abc"/></svg>',encoding='utf-8')
    rejects(lambda:resource('../outside.png',p,'image'))
    rejects(lambda:resource('https://example.test/p.png',p,'image'))
    sample=copy.deepcopy(data);sample['scenes']=sample['scenes'][:1];sample['scenes'][0]['image']='ok.svg';sample['title']='摘句 </script><script>alert(1)</script>'
    for i,h in enumerate(sample['scenes'][0]['hotspots']):
        h['art']=f'art-{i}.svg';(p/h['art']).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#{i+1}ab"/></svg>',encoding='utf-8')
    sample['scenes'][0]['hotspots'][0]['reveal']={'button':'翻开','art':'revealed.svg','artAlt':'翻开后的细节','text':'看见隐藏的细节'}
    (p/'revealed.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><circle cx="5" cy="5" r="4" fill="#cba"/></svg>',encoding='utf-8')
    (p/'lesson.json').write_text(json.dumps(sample,ensure_ascii=False),encoding='utf-8');build(p/'lesson.json',p/'index.html')
    result=verify(p/'index.html');assert result['static']=='PASS',result
    assert result['embedded_images']==5,result
    assert (p/'index.html').read_text(encoding='utf-8').count('</script>')==2
    (p/'revealed.svg').write_bytes((p/'art-0.svg').read_bytes());rejects(lambda:build(p/'lesson.json',p/'index.html'))
    (p/'revealed.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><circle cx="5" cy="5" r="4" fill="#cba"/></svg>',encoding='utf-8')
    (p/'art-1.svg').write_bytes((p/'art-0.svg').read_bytes());rejects(lambda:build(p/'lesson.json',p/'index.html'))
print('PASS: self-contained build, JSON escaping, SVG/remote/path guards, duplicate ids/art and coordinate validation')
