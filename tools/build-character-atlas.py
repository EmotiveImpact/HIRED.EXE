#!/usr/bin/env python3
"""Repack generated alpha art into deterministic game atlases.

This is an asset-integration tool: it crops invisible padding and scales with
nearest-neighbour interpolation. It never draws or synthesises game art.
Generated source files remain unchanged.
"""
from pathlib import Path
from PIL import Image
import json
import hashlib

ROOT=Path(__file__).resolve().parents[1]
CHAR=ROOT/"assets/production/characters"
ENEMY=ROOT/"assets/production/enemies"
HERO_NAMES=["idle_0","idle_1","run_0","run_1","run_2","run_3",
            "run_4","run_5","jump_0","jump_1","fall_0","dash_0",
            "dash_1","hurt_0","crouch_0","victory_0","victory_1","idle_2"]
ENEMY_NAMES=["cv_0","cv_1","envelope_0","envelope_1","plane_0","plane_1",
             "recruitmentbot","scopecreep","algorithm","finalreview","bulb","code",
             "heart","bricks","palette","cube","terminal","briefcase"]

def cell_crop(im,col,row):
    rect=(round(col*im.width/6),round(row*im.height/3),
          round((col+1)*im.width/6),round((row+1)*im.height/3))
    cell=im.crop(rect)
    # Alpha is used only to find the content rectangle; original alpha is kept.
    bounds=cell.getchannel("A").point(lambda a:255 if a>64 else 0).getbbox()
    assert bounds, "Empty sprite cell"
    x0,y0,x1,y1=bounds
    crop=(max(0,x0-2),max(0,y0-2),min(cell.width,x1+2),min(cell.height,y1+2))
    return cell.crop(crop), [rect[0]+crop[0],rect[1]+crop[1],
                             rect[0]+crop[2],rect[1]+crop[3]]

def write_hero():
    src=CHAR/"hero-source.png"; im=Image.open(src).convert("RGBA")
    cw,ch=80,96
    out=Image.new("RGBA",(cw*6,ch*3))
    frames={}
    for i,name in enumerate(HERO_NAMES):
        col,row=i%6,i//6
        cut,source=cell_crop(im,col,row)
        # Common scale across all 18 poses preserves crouch/jump proportions.
        sz=tuple(round(v*.30) for v in cut.size)
        assert sz[0]<=cw-4 and sz[1]<=ch-6,(name,sz)
        cut=cut.resize(sz,Image.Resampling.NEAREST)
        px=col*cw+(cw-sz[0])//2; py=row*ch+92-sz[1]
        out.alpha_composite(cut,(px,py))
        frames[name]={"x":col*cw,"y":row*ch,"w":cw,"h":ch,
                      "anchor":[40,92],"bounds":[px-col*cw,py-row*ch,*sz],
                      "sourceRect":source}
    out.save(CHAR/"hero-atlas.png",optimize=True)
    animations={
        "idle":{"frames":["idle_0","idle_1","idle_0","idle_2"],"fps":3,"loop":True},
        "run":{"frames":["run_0","run_1","run_2","run_3","run_4","run_5"],"fps":12,"loop":True},
        "jump":{"frames":["jump_0","jump_1"],"fps":7,"loop":False},
        "fall":{"frames":["fall_0"],"fps":1,"loop":True},
        "dash":{"frames":["dash_0","dash_1"],"fps":12,"loop":True},
        "hurt":{"frames":["hurt_0"],"fps":1,"loop":True},
        "crouch":{"frames":["crouch_0"],"fps":1,"loop":True},
        "victory":{"frames":["victory_0","victory_1"],"fps":4,"loop":True}
    }
    meta={"image":"assets/production/characters/hero-atlas.png","size":list(out.size),
          "cell":[cw,ch],"anchor":[40,92],"face":"right","mirrorForLeft":True,
          "frames":frames,"animations":animations,
          "source":"hero-source.png","sourceSha256":hashlib.sha256(src.read_bytes()).hexdigest()}
    (CHAR/"hero-atlas.json").write_text(json.dumps(meta,indent=2)+"\n")
    # This portrait is a lossless crop from the approved concept, not a new face.
    approved=Image.open(ROOT/"assets/reference/hero-approved.png").convert("RGBA")
    approved.crop((1018,166,1215,340)).save(CHAR/"portrait-reference.png")

def write_enemies():
    src=ENEMY/"enemy-cutout.png";im=Image.open(src).convert("RGBA")
    cw=ch=128;out=Image.new("RGBA",(cw*6,ch*3));frames={}
    for i,name in enumerate(ENEMY_NAMES):
        col,row=i%6,i//6
        cut,source=cell_crop(im,col,row)
        scale=min(112/cut.width,112/cut.height)
        sz=tuple(round(v*scale) for v in cut.size)
        cut=cut.resize(sz,Image.Resampling.NEAREST)
        px=col*cw+(cw-sz[0])//2;py=row*ch+120-sz[1]
        out.alpha_composite(cut,(px,py))
        frames[name]={"x":px,"y":py,"w":sz[0],"h":sz[1],
                      "anchor":[sz[0]/2,sz[1]],"cell":[col*cw,row*ch,cw,ch],
                      "sourceRect":source}
    out.save(ENEMY/"enemy-atlas.png",optimize=True)
    meta={"image":"assets/production/enemies/enemy-atlas.png","size":list(out.size),
          "frames":frames,
          "animations":{"cv":{"frames":["cv_0","cv_1"],"fps":5},
                        "envelope":{"frames":["envelope_0","envelope_1"],"fps":5},
                        "plane":{"frames":["plane_0","plane_1"],"fps":4}},
          "bosses":["recruitmentbot","scopecreep","algorithm","finalreview"],
          "collectibles":["bulb","code","heart","bricks","palette","cube","terminal","briefcase"],
          "source":"enemy-cutout.png","sourceSha256":hashlib.sha256(src.read_bytes()).hexdigest()}
    (ENEMY/"enemy-atlas.json").write_text(json.dumps(meta,indent=2)+"\n")
    # Lossless isolated frames are convenient for UI icons.
    icons=ENEMY/"icons";icons.mkdir(exist_ok=True)
    for name in meta["collectibles"]:
        f=frames[name];out.crop((f["x"],f["y"],f["x"]+f["w"],f["y"]+f["h"])).save(icons/f"{name}.png")

if __name__=="__main__":
    write_hero();write_enemies()
    print("Rebuilt hero-atlas.png (18 frames) and enemy-atlas.png (18 assets).")

