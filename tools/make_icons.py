from PIL import Image, ImageDraw
import os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'icons'))
BG=(31,41,55); GOLD=(245,158,11); PINK=(219,39,119); WHITE=(255,255,255); TEAL=(15,118,110)
def draw(size, maskable=False, rounded=False):
    S=1024; im=Image.new('RGBA',(S,S),BG+(255,) if not rounded else (0,0,0,0)); d=ImageDraw.Draw(im)
    if rounded: d.rounded_rectangle([0,0,S-1,S-1],radius=200,fill=BG)
    # neon gradient-ish ring
    sc = 0.62 if maskable else 0.8   # keep artwork inside the maskable safe zone (inner 80% circle)
    cx,cy=S/2,S/2+20; R=S*sc/2
    # map pin
    pr=R*0.62; pcy=cy-R*0.18
    d.polygon([(cx-pr*0.82,pcy+pr*0.55),(cx+pr*0.82,pcy+pr*0.55),(cx,cy+R*0.95)],fill=PINK)
    d.ellipse([cx-pr,pcy-pr,cx+pr,pcy+pr],fill=PINK)
    # martini glass inside pin
    g=pr*0.62; top=pcy-g*0.75
    d.polygon([(cx-g,top),(cx+g,top),(cx,top+g*1.05)],fill=WHITE)
    d.polygon([(cx-g*0.72,top+g*0.22),(cx+g*0.72,top+g*0.22),(cx,top+g*0.92)],fill=GOLD)
    d.rectangle([cx-g*0.07,top+g*1.0,cx+g*0.07,top+g*1.55],fill=WHITE)
    d.rounded_rectangle([cx-g*0.45,top+g*1.5,cx+g*0.45,top+g*1.66],radius=int(g*0.08),fill=WHITE)
    # olive
    d.line([(cx+g*0.15,top-g*0.25),(cx-g*0.25,top+g*0.5)],fill=WHITE,width=max(4,int(g*0.06)))
    d.ellipse([cx-g*0.18,top+g*0.18,cx+g*0.06,top+g*0.42],fill=(132,204,22))
    return im.resize((size,size),Image.LANCZOS)
draw(192).convert('RGB').save('icon-192.png')
draw(512).convert('RGB').save('icon-512.png')
draw(512,maskable=True).convert('RGB').save('icon-maskable-512.png')
draw(192,maskable=True).convert('RGB').save('icon-maskable-192.png')
draw(180).convert('RGB').save('apple-touch-icon.png')
draw(32).convert('RGB').save('favicon-32.png')
print('icons ok')
