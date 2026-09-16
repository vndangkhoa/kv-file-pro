#!/usr/bin/env python3
"""
KV Files — Mock File Extensions Generator
Spawns a rich, realistic test suite of mock files covering all file extensions
supported by KV Files (CAD 2D/3D, Adobe Creative Suite, Typography & Fonts,
SysVis Flowcharts, Markdown Studio, Archives, and Code).
"""

import os
import sys
import shutil
import zipfile
import tarfile
import gzip
import io
import base64
import argparse
import urllib.request
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

DOWNLOAD_SOURCES = {
    "commercial_office_building.ifc": "https://raw.githubusercontent.com/viktor-platform/ifc-sample-models/main/sample-models/SampleBuilding.ifc",
    "planetary_gearbox.step": "https://raw.githubusercontent.com/tpaviot/pythonocc-demos/master/assets/models/Ventilator.stp",
    "turbine_mounting_bracket.stl": "https://raw.githubusercontent.com/tpaviot/pythonocc-demos/master/assets/models/fan.stl",
    "magazine_editorial.idml": "https://raw.githubusercontent.com/Starou/SimpleIDML/master/tests/regressiontests/IDML/magazineA-edito.idml",
    "commercial_cut_v4.prproj": "https://raw.githubusercontent.com/supercuts/prproj-rs/master/test_files/test.zipped.prproj",
    "motion_graphics_intro.aepx": "https://raw.githubusercontent.com/actumn/aepx.js/master/examples/input/2layers1image.aepx",
}

PORTRAIT_PHOTO_URL = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1200&auto=format&fit=crop"

def download_url_to_file(url: str, dest_path: Path, timeout: int = 15) -> bool:
    """Attempts to download an authentic file from a verified URL, with timeout."""
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) KVFiles/2.0'})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            if resp.status == 200:
                data = resp.read()
                if len(data) > 64:
                    dest_path.write_bytes(data)
                    return True
    except Exception as e:
        print(f"      ⚠ Online download skipped/failed for {dest_path.name} ({e}), falling back to generator.")
    return False

def get_script_dir():
    return Path(__file__).resolve().parent

def get_project_root():
    return get_script_dir().parent

def ensure_dir(path: Path):
    path.mkdir(parents=True, exist_ok=True)
    return path

# ------------------------------------------------------------------------------
# 1. Helper to generate sample image data using Pillow
# ------------------------------------------------------------------------------
def create_sample_image(width=640, height=480, bg_color=(24, 32, 54), text="KV Files Studio", fmt="JPEG") -> bytes:
    img = Image.new("RGB", (width, height), color=bg_color)
    draw = ImageDraw.Draw(img)
    
    # Draw geometric decorative lines / frame
    draw.rectangle([16, 16, width - 16, height - 16], outline=(70, 90, 140), width=2)
    draw.line([16, 16, width - 16, height - 16], fill=(40, 55, 90), width=1)
    draw.line([16, height - 16, width - 16, 16], fill=(40, 55, 90), width=1)
    
    # Draw title block
    draw.rectangle([width // 4, height // 3, 3 * width // 4, 2 * height // 3], fill=(35, 45, 75), outline=(99, 102, 241), width=2)
    draw.text((width // 2, height // 2 - 10), text, fill=(240, 245, 255), anchor="mm")
    draw.text((width // 2, height // 2 + 18), f"{width}x{height} • Preview Specimen", fill=(160, 175, 210), anchor="mm")
    
    buf = io.BytesIO()
    img.save(buf, format=fmt, quality=92 if fmt == "JPEG" else None)
    return buf.getvalue()

# ------------------------------------------------------------------------------
# 2. CAD & 3D Generators
# ------------------------------------------------------------------------------
def generate_dxf_file(out_path: Path):
    """Generates a multi-layer mechanical flange bracket ASCII DXF file."""
    dxf_content = """0
SECTION
2
HEADER
9
$ACADVER
1
AC1015
0
ENDSEC
0
SECTION
2
TABLES
0
TABLE
2
LAYER
70
4
0
LAYER
2
OUTLINE
70
0
62
3
6
CONTINUOUS
0
LAYER
2
HOLES
70
0
62
1
6
CONTINUOUS
0
LAYER
2
CENTERLINES
70
0
62
4
6
CENTER
0
LAYER
2
ANNOTATIONS
70
0
62
7
6
CONTINUOUS
0
ENDTAB
0
ENDSEC
0
SECTION
2
ENTITIES
0
LINE
8
OUTLINE
10
-100.0
20
-60.0
30
0.0
11
100.0
21
-60.0
31
0.0
0
LINE
8
OUTLINE
10
100.0
20
-60.0
30
0.0
11
100.0
21
60.0
31
0.0
0
LINE
8
OUTLINE
10
100.0
20
60.0
30
0.0
11
-100.0
21
60.0
31
0.0
0
LINE
8
OUTLINE
10
-100.0
20
60.0
30
0.0
11
-100.0
21
-60.0
31
0.0
0
CIRCLE
8
HOLES
10
0.0
20
0.0
30
0.0
40
35.0
0
CIRCLE
8
HOLES
10
-70.0
20
-30.0
30
0.0
40
8.0
0
CIRCLE
8
HOLES
10
70.0
20
-30.0
30
0.0
40
8.0
0
CIRCLE
8
HOLES
10
-70.0
20
30.0
30
0.0
40
8.0
0
CIRCLE
8
HOLES
10
70.0
20
30.0
30
0.0
40
8.0
0
LINE
8
CENTERLINES
10
-120.0
20
0.0
30
0.0
11
120.0
21
0.0
31
0.0
0
LINE
8
CENTERLINES
10
0.0
20
-80.0
30
0.0
11
0.0
21
80.0
31
0.0
0
TEXT
8
ANNOTATIONS
10
-60.0
20
72.0
30
0.0
40
6.0
1
FLANGE MOUNT BRACKET [REV C]
0
TEXT
8
ANNOTATIONS
10
-18.0
20
-4.0
30
0.0
40
5.0
1
DIA 70.0 BORE
0
ENDSEC
0
EOF
"""
    out_path.write_text(dxf_content, encoding="ascii")

def generate_step_file(out_path: Path):
    """Generates an ISO-10303-21 STEP mechanical assembly model."""
    step_content = """ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('KV Files 3D Mechanical Assembly Model','B-Rep Solid Prototype'),'2;1');
FILE_NAME('planetary_gearbox_assembly.step','2026-09-15T12:00:00',('Design Engineer'),('KV CAD Lab'),'KV-CAD-STEP-V1','FreeCAD / OpenCASCADE','Approved');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN { 1 0 10303 214 1 1 1 1 }'));
ENDSEC;
DATA;
#10 = APPLICATION_CONTEXT('mechanical design');
#11 = APPLICATION_PROTOCOL_DEFINITION('international standard','automotive_design',2000,#10);
#12 = PRODUCT_DEFINITION_CONTEXT('part definition',#10,'design');
#13 = PRODUCT('Planetary_Gearbox','Planetary Gearbox Assembly','Assembly Solid',(#12));
#14 = PRODUCT_DEFINITION_FORMATION('1.0','Initial Release',#13);
#15 = PRODUCT_DEFINITION('design','Assembly Definition',#14,#12);
#20 = CARTESIAN_POINT('',(0.0,0.0,0.0));
#21 = DIRECTION('',(0.0,0.0,1.0));
#22 = DIRECTION('',(1.0,0.0,0.0));
#23 = AXIS2_PLACEMENT_3D('',#20,#21,#22);
#30 = MANIFOLD_SOLID_BREP('Casing_Housing',#40);
#40 = CLOSED_SHELL('',(#50,#51,#52,#53,#54,#55));
#50 = ADVANCED_FACE('',(#60),#70,.T.);
#60 = FACE_OUTER_BOUND('',#80,.T.);
#70 = PLANE('',#23);
#80 = EDGE_LOOP('',(#90,#91,#92,#93));
#90 = ORIENTED_EDGE('',*,*,#100,.T.);
#91 = ORIENTED_EDGE('',*,*,#101,.T.);
#92 = ORIENTED_EDGE('',*,*,#102,.T.);
#93 = ORIENTED_EDGE('',*,*,#103,.T.);
#100 = EDGE_CURVE('',#110,#111,#120,.T.);
#101 = EDGE_CURVE('',#111,#112,#121,.T.);
#102 = EDGE_CURVE('',#112,#113,#122,.T.);
#103 = EDGE_CURVE('',#113,#110,#123,.T.);
#110 = VERTEX_POINT('',#130);
#111 = VERTEX_POINT('',#131);
#112 = VERTEX_POINT('',#132);
#113 = VERTEX_POINT('',#133);
#130 = CARTESIAN_POINT('',(-50.0,-50.0,0.0));
#131 = CARTESIAN_POINT('',(50.0,-50.0,0.0));
#132 = CARTESIAN_POINT('',(50.0,50.0,0.0));
#133 = CARTESIAN_POINT('',(-50.0,50.0,0.0));
#120 = LINE('',#130,#22);
#121 = LINE('',#131,#21);
#122 = LINE('',#132,#22);
#123 = LINE('',#133,#21);
ENDSEC;
END-ISO-10303-21;
"""
    out_path.write_text(step_content, encoding="utf-8")

def generate_ifc_file(out_path: Path):
    """Generates an IFC4 BIM building architectural model."""
    ifc_content = """ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('Commercial Office BIM Model','Level 2 Architecture'),'2;1');
FILE_NAME('commercial_building_bim.ifc','2026-09-15T12:00:00',('Architect'),('BuildingSmart'),'Revit IFC 2026','Revit 2026','Approved');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1= IFCPROJECT('0YvB_G$2P1w8qL1zX3uV7a',#2,'Commercial Office Complex','Multi-storey office headquarters',$,$,$,(#10),#30);
#2= IFCOWNERHISTORY(#3,#4,$,.ADDED.,1726390000,$,$,1726390000);
#3= IFCPERSONANDORGANIZATION(#5,#6,$);
#5= IFCPERSON($,'Lead Architect','BIM Team',$,$,$,$,$);
#6= IFCORGANIZATION($,'KV Architecture Studio','AEC Engineering',$,$);
#4= IFCAPPLICATION(#6,'2026.1','KV BIM Studio','kv-bim');
#10= IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,0.001,#11,#12);
#11= IFCAXIS2PLACEMENT3D(#13,$,$);
#12= IFCDIRECTION((0.,1.,0.));
#13= IFCCARTESIANPOINT((0.,0.,0.));
#20= IFCSITE('1ZbK_M$4T9x2pA5yW8rE2b',#2,'Metropolitan Campus Site',$,$,#21,$,$,.ELEMENT.,(40,42,51,0),(-74,0,21,0),15.0,$,$);
#21= IFCLOCALPLACEMENT($,#11);
#25= IFCBUILDING('2VnC_P$6R3y7tK9qJ4wD1c',#2,'Tower One',$,$,#26,$,$,.ELEMENT.,$,$,$);
#26= IFCLOCALPLACEMENT(#21,#11);
#27= IFCBUILDINGSTOREY('3WpD_Q$8S5z1uL2rK5xE2d',#2,'Level 02 - Open Workspace',$,$,#28,$,$,.ELEMENT.,7.2);
#28= IFCLOCALPLACEMENT(#26,#11);
#30= IFCUNITASSIGNMENT((#31,#32,#33));
#31= IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);
#32= IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.);
#33= IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.);
#40= IFCSLAB('4XqE_R$0T7a3vM4sL6yF3e',#2,'Post-Tensioned Floor Parapet',$,$,#41,#45,$,.FLOOR.);
#41= IFCLOCALPLACEMENT(#28,#11);
#45= IFCPRODUCTDEFINITIONSHAPE($,$,(#46));
#46= IFCSHAPEREPRESENTATION(#10,'Body','Brep',(#47));
#47= IFCFACETEDBREP(#48);
#48= IFCCLOSEDSHELL((#50,#51));
#50= IFCFACE((#52));
#51= IFCFACE((#53));
#52= IFCFACEOUTERBOUND(#54,.T.);
#53= IFCFACEOUTERBOUND(#55,.T.);
#54= IFCPOLYLOOP((#60,#61,#62,#63));
#55= IFCPOLYLOOP((#64,#65,#66,#67));
#60= IFCCARTESIANPOINT((-12.0,-10.0,0.0));
#61= IFCCARTESIANPOINT((12.0,-10.0,0.0));
#62= IFCCARTESIANPOINT((12.0,10.0,0.0));
#63= IFCCARTESIANPOINT((-12.0,10.0,0.0));
#64= IFCCARTESIANPOINT((-12.0,-10.0,0.3));
#65= IFCCARTESIANPOINT((12.0,-10.0,0.3));
#66= IFCCARTESIANPOINT((12.0,10.0,0.3));
#67= IFCCARTESIANPOINT((-12.0,10.0,0.3));
#70= IFCCURTAINWALL('5YrF_S$2U9b5wN6tM8zG4f',#2,'North Facade Double-Glazed Curtain',$,$,#28,$,$,$);
ENDSEC;
END-ISO-10303-21;
"""
    out_path.write_text(ifc_content, encoding="utf-8")

def generate_stl_file(out_path: Path):
    """Generates an ASCII STL 3D facet solid mesh."""
    stl_content = """solid turbine_mounting_bracket
  facet normal 0.000000 0.000000 -1.000000
    outer loop
      vertex 0.000000 0.000000 0.000000
      vertex 100.000000 0.000000 0.000000
      vertex 100.000000 80.000000 0.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 -1.000000
    outer loop
      vertex 0.000000 0.000000 0.000000
      vertex 100.000000 80.000000 0.000000
      vertex 0.000000 80.000000 0.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 1.000000
    outer loop
      vertex 0.000000 0.000000 40.000000
      vertex 100.000000 80.000000 40.000000
      vertex 100.000000 0.000000 40.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 1.000000
    outer loop
      vertex 0.000000 0.000000 40.000000
      vertex 0.000000 80.000000 40.000000
      vertex 100.000000 80.000000 40.000000
    endloop
  endfacet
  facet normal 0.000000 -1.000000 0.000000
    outer loop
      vertex 0.000000 0.000000 0.000000
      vertex 100.000000 0.000000 40.000000
      vertex 100.000000 0.000000 0.000000
    endloop
  endfacet
  facet normal 0.000000 -1.000000 0.000000
    outer loop
      vertex 0.000000 0.000000 0.000000
      vertex 0.000000 0.000000 40.000000
      vertex 100.000000 0.000000 40.000000
    endloop
  endfacet
endsolid turbine_mounting_bracket
"""
    out_path.write_text(stl_content, encoding="ascii")

def generate_obj_file(out_path: Path):
    """Generates a 3D Wavefront OBJ mesh."""
    obj_content = """# KV Files Wavefront OBJ Specimen
# Object: Low-Poly Space Shuttle
o SpaceShuttle_Mesh
v -10.00 0.00 -20.00
v 10.00 0.00 -20.00
v 15.00 0.00 10.00
v 0.00 5.00 25.00
v -15.00 0.00 10.00
v 0.00 8.00 -15.00
vn 0.0 1.0 0.0
vn 0.0 -1.0 0.0
vn 0.8 0.5 0.3
vn -0.8 0.5 0.3
s 1
f 1//2 2//2 3//2 5//2
f 5//4 3//4 4//4
f 1//4 5//4 6//4
f 2//3 6//3 3//3
f 3//3 6//3 4//3
f 5//4 4//4 6//4
"""
    out_path.write_text(obj_content, encoding="ascii")

# ------------------------------------------------------------------------------
# 3. Adobe Suite Package Generators
# ------------------------------------------------------------------------------
def generate_idml_file(out_path: Path):
    """Generates an InDesign Markup Package (.idml) ZIP archive."""
    fonts_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<idPkg:Fonts xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging">
  <FontFamily="Inter Display" Name="Inter Display" FontStyleName="Bold"/>
  <FontFamily="Geist Mono" Name="Geist Mono" FontStyleName="Regular"/>
  <FontFamily="Cinzel Decorative" Name="Cinzel Decorative" FontStyleName="Black"/>
  <FontFamily="Helvetica Neue" Name="Helvetica Neue" FontStyleName="Roman"/>
</idPkg:Fonts>"""

    graphic_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<idPkg:Graphic xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging">
  <Color Self="Color/CorporateBlue" Model="Process" Space="CMYK" ColorValue="100 75 0 10"/>
  <Color Self="Color/EmeraldAccent" Model="Process" Space="CMYK" ColorValue="70 0 100 0"/>
  <Color Self="Color/NeonAmber" Model="Process" Space="RGB" ColorValue="245 158 11"/>
  <Color Self="Color/SlateDark" Model="Process" Space="RGB" ColorValue="30 41 59"/>
</idPkg:Graphic>"""

    story1_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<idPkg:Story xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging">
  <Story Self="u124" AppliedTOCStyle="n">
    <ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/Header1">
      <CharacterStyleRange AppliedCharacterStyle="CharacterStyle/Title">
        <Content>KV Files Architecture &amp; High-Concurrency Design</Content>
      </CharacterStyleRange>
    </ParagraphStyleRange>
    <ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/BodyText">
      <CharacterStyleRange AppliedCharacterStyle="CharacterStyle/Normal">
        <Content>A modern self-hosted web file manager engineered with pure Rust Axum backend, Tokio async runtime, embedded SQLite WAL metadata engine, and mobile-first React PWA.</Content>
      </CharacterStyleRange>
    </ParagraphStyleRange>
  </Story>
</idPkg:Story>"""

    story2_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<idPkg:Story xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging">
  <Story Self="u125">
    <ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/Quote">
      <CharacterStyleRange>
        <Content>Sub-millisecond kernel inotify filesystem notifications broadcast live directory mutations over WebSockets.</Content>
      </CharacterStyleRange>
    </ParagraphStyleRange>
  </Story>
</idPkg:Story>"""

    spread1_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<idPkg:Spread xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging">
  <Spread Self="Spread_Cover" PageCount="2" BindingLocation="1"/>
</idPkg:Spread>"""

    spread2_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<idPkg:Spread xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging">
  <Spread Self="Spread_FeatureArticle" PageCount="2" BindingLocation="1"/>
</idPkg:Spread>"""

    container_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="designmap.xml" media-type="application/vnd.adobe.indesign-idml-package"/>
  </rootfiles>
</container>"""

    with zipfile.ZipFile(out_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
        # mimetype must be stored uncompressed
        zf.writestr('mimetype', 'application/vnd.adobe.indesign-idml-package', compress_type=zipfile.ZIP_STORED)
        zf.writestr('META-INF/container.xml', container_xml)
        zf.writestr('Resources/Fonts.xml', fonts_xml)
        zf.writestr('Resources/Graphic.xml', graphic_xml)
        zf.writestr('Stories/Story_u124.xml', story1_xml)
        zf.writestr('Stories/Story_u125.xml', story2_xml)
        zf.writestr('Spreads/Spread_Cover.xml', spread1_xml)
        zf.writestr('Spreads/Spread_FeatureArticle.xml', spread2_xml)

def draw_mobile_prototype_image(w=800, h=1200) -> bytes:
    """Renders a high-fidelity mobile application UI mockup for Adobe XD."""
    img = Image.new('RGB', (w, h), color=(13, 17, 23))
    d = ImageDraw.Draw(img)
    
    # 1. Status bar
    d.text((40, 20), '9:41', fill=(240, 246, 252))
    d.rectangle([w - 80, 24, w - 45, 36], outline=(200, 210, 225), width=1)
    d.rectangle([w - 78, 26, w - 50, 34], fill=(70, 210, 120))
    d.rectangle([w - 44, 28, w - 42, 32], fill=(200, 210, 225))
    
    # 2. Header
    d.ellipse([40, 60, 96, 116], fill=(56, 189, 248), outline=(14, 116, 144), width=2)
    d.text((68, 88), 'KV', fill=(255, 255, 255), anchor='mm')
    d.text((115, 75), 'Welcome back,', fill=(139, 148, 158))
    d.text((115, 98), 'KV Files Mobile UX', fill=(240, 246, 252))
    
    # Header badge
    d.rounded_rectangle([w - 140, 72, w - 40, 102], radius=8, fill=(33, 38, 45), outline=(48, 54, 61))
    d.text((w - 90, 87), 'PRO PASS', fill=(234, 179, 8), anchor='mm')
    
    # 3. Storage Pool Analytics Card
    card_y = 140
    d.rounded_rectangle([40, card_y, w - 40, card_y + 155], radius=16, fill=(22, 27, 34), outline=(48, 54, 61))
    d.text((65, card_y + 24), 'HYBRID CLUSTER STORAGE', fill=(56, 189, 248))
    d.text((65, card_y + 55), '142.8 GB / 512.0 GB', fill=(255, 255, 255))
    d.text((w - 65, card_y + 55), '28% USED', fill=(139, 148, 158), anchor='ra')
    
    # Multi-color Progress bar
    bar_y = card_y + 85
    d.rounded_rectangle([65, bar_y, w - 65, bar_y + 14], radius=7, fill=(33, 38, 45))
    d.rounded_rectangle([65, bar_y, 65 + 260, bar_y + 14], radius=7, fill=(59, 130, 246))
    d.rounded_rectangle([65 + 260, bar_y, 65 + 380, bar_y + 14], radius=0, fill=(168, 85, 247))
    d.rounded_rectangle([65 + 380, bar_y, 65 + 460, bar_y + 14], radius=0, fill=(16, 185, 129))
    
    # Legend
    d.text((65, card_y + 120), '● CAD & 3D (57 GB)', fill=(96, 165, 250))
    d.text((250, card_y + 120), '● Adobe (36 GB)', fill=(192, 132, 252))
    d.text((420, card_y + 120), '● Archives (21 GB)', fill=(52, 211, 153))
    
    # 4. Quick Actions
    qa_y = 320
    actions = [('Quick Look', (59, 130, 246)), ('BIM & CAD', (6, 182, 212)), ('Flowcharts', (99, 102, 241)), ('Archives', (245, 158, 11))]
    btn_w = (w - 80 - 30) // 4
    for i, (act, col) in enumerate(actions):
        bx = 40 + i * (btn_w + 10)
        d.rounded_rectangle([bx, qa_y, bx + btn_w, qa_y + 70], radius=12, fill=(22, 27, 34), outline=(48, 54, 61))
        d.ellipse([bx + btn_w // 2 - 12, qa_y + 14, bx + btn_w // 2 + 12, qa_y + 38], fill=col)
        d.text((bx + btn_w // 2, qa_y + 52), act, fill=(200, 210, 225), anchor='mm')
        
    # 5. Recent Project Files
    sec_y = 420
    d.text((42, sec_y), 'RECENT WORKSPACE ASSETS', fill=(240, 246, 252))
    d.text((w - 42, sec_y), 'VIEW ALL (24)', fill=(56, 189, 248), anchor='ra')
    
    items = [
        ('commercial_office_building.ifc', 'BIM Spatial Model • 6.74 MB • 2m ago', 'IFC 2x3', (6, 182, 212)),
        ('brand_identity_artboard.psd', 'Photoshop Composite • 12.58 MB • 15m ago', 'PSD CMYK', (168, 85, 247)),
        ('planetary_gearbox.step', 'Parametric Solid Model • 2.25 MB • 1h ago', 'STEP 3D', (245, 158, 11)),
        ('cloud_microservices.mmd', 'SysVis Architecture Flow • 1.04 KB • 3h ago', 'DIAGRAM', (59, 130, 246)),
        ('studio_portrait_raw.dng', 'Sony Alpha 7R V RAW • 148 KB • Yesterday', 'RAW EXIF', (16, 185, 129)),
    ]
    
    for idx, (title, sub, tag, col) in enumerate(items):
        iy = sec_y + 35 + idx * 115
        d.rounded_rectangle([40, iy, w - 40, iy + 100], radius=14, fill=(22, 27, 34), outline=(48, 54, 61))
        # Icon
        d.rounded_rectangle([55, iy + 18, 115, iy + 78], radius=10, fill=col)
        d.text((85, iy + 48), title[:2].upper(), fill=(255, 255, 255), anchor='mm')
        # Title and sub
        d.text((130, iy + 28), title, fill=(240, 246, 252))
        d.text((130, iy + 52), sub, fill=(139, 148, 158))
        # Tag
        d.rounded_rectangle([w - 145, iy + 24, w - 55, iy + 50], radius=6, fill=(33, 38, 45), outline=(48, 54, 61))
        d.text((w - 100, iy + 37), tag, fill=col, anchor='mm')
        
    # 6. Bottom Navigation Bar
    d.rounded_rectangle([40, h - 85, w - 40, h - 25], radius=25, fill=(22, 27, 34), outline=(56, 189, 248), width=1)
    navs = ['Home', 'Files', 'Viewer', 'Sync', 'Settings']
    nw = (w - 80) // 5
    for i, nv in enumerate(navs):
        nx = 40 + i * nw + nw // 2
        col = (56, 189, 248) if i == 0 else (139, 148, 158)
        d.text((nx, h - 55), nv, fill=col, anchor='mm')
        if i == 0:
            d.ellipse([nx - 2, h - 38, nx + 2, h - 34], fill=(56, 189, 248))
            
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()

def generate_xd_file(out_path: Path):
    """Generates an Adobe XD (.xd) ZIP package with manifest and high-fidelity prototype thumbnail."""
    manifest_json = """{
  "name": "KV Files Mobile UX Design",
  "version": "57.1.12",
  "children": [
    { "id": "artboard-1", "name": "01_Miller_Columns_Explorer", "width": 393, "height": 852 },
    { "id": "artboard-2", "name": "02_Spacebar_QuickLook_Preview", "width": 393, "height": 852 },
    { "id": "artboard-3", "name": "03_Commander_Dual_Pane_Split", "width": 852, "height": 393 },
    { "id": "artboard-4", "name": "04_Settings_Extension_Store", "width": 393, "height": 852 }
  ],
  "interactions": true
}"""
    thumb_png = draw_mobile_prototype_image(800, 1200)
    with zipfile.ZipFile(out_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr('manifest', manifest_json)
        zf.writestr('resources/thumbnail.png', thumb_png)

def generate_prproj_file(out_path: Path):
    """Generates an Adobe Premiere Pro (.prproj) Gzipped XML sequence project."""
    xml_content = """<?xml version="1.0" encoding="UTF-8"?>
<PremiereData Version="39">
  <Project>
    <Name>Commercial Product Launch 2026</Name>
  </Project>
  <Sequence>
    <Name>Master 4K Cinematic Cut</Name>
    <Width>3840</Width>
    <Height>2160</Height>
    <VideoTrack/>
    <VideoTrack/>
    <VideoTrack/>
    <AudioTrack/>
    <AudioTrack/>
  </Sequence>
  <Sequence>
    <Name>Social Reel (9:16 Vertical)</Name>
    <Width>1080</Width>
    <Height>1920</Height>
    <VideoTrack/>
    <AudioTrack/>
  </Sequence>
  <Media>
    <Name>drone_coastal_hyperlapse_4k.mp4</Name>
    <FilePath>/storage/media/drone_coastal_hyperlapse_4k.mp4</FilePath>
  </Media>
  <Media>
    <Name>studio_voiceover_take_03.wav</Name>
    <FilePath>/storage/media/studio_voiceover_take_03.wav</FilePath>
  </Media>
  <Media>
    <Name>ambient_electronic_soundtrack.flac</Name>
    <FilePath>/storage/media/ambient_electronic_soundtrack.flac</FilePath>
  </Media>
  <Marker>
    <Name>Beat Drop</Name>
    <Comment>Synchronize camera pan with synthesizer chord entrance</Comment>
    <Frame>144</Frame>
    <Color>Magenta</Color>
  </Marker>
  <Marker>
    <Name>Logo Reveal</Name>
    <Comment>Fade in KV Files hero emblem</Comment>
    <Frame>360</Frame>
    <Color>Cyan</Color>
  </Marker>
</PremiereData>
"""
    with gzip.open(out_path, 'wb') as f:
        f.write(xml_content.encode('utf-8'))

def generate_aepx_file(out_path: Path):
    """Generates an Adobe After Effects (.aepx) XML project file."""
    aepx_content = """<?xml version="1.0" encoding="UTF-8"?>
<AfterEffectsProject>
  <CompItem>
    <Name>Holographic 3D Logo Reveal</Name>
    <Width>3840</Width>
    <Height>2160</Height>
    <FrameRate>60.0</FrameRate>
  </CompItem>
  <CompItem>
    <Name>Neon Cyberpunk Lower Thirds</Name>
    <Width>1920</Width>
    <Height>1080</Height>
    <FrameRate>30.0</FrameRate>
  </CompItem>
  <CompItem>
    <Name>Particle Glitch Transition</Name>
    <Width>1920</Width>
    <Height>1080</Height>
    <FrameRate>60.0</FrameRate>
  </CompItem>
  <FootageItem>
    <Name>particle_smoke_loop_4k.mp4</Name>
  </FootageItem>
  <FootageItem>
    <Name>brand_emblem_vector.ai</Name>
  </FootageItem>
  <FootageItem>
    <Name>audio_whoosh_fx.wav</Name>
  </FootageItem>
</AfterEffectsProject>
"""
    out_path.write_text(aepx_content, encoding="utf-8")

def generate_dng_file(out_path: Path):
    """Generates an Adobe DNG RAW file with embedded high-resolution portrait photograph and XMP camera telemetry."""
    # Attempt to fetch genuine high-res photographic specimen
    photo_bytes = None
    try:
        req = urllib.request.Request(PORTRAIT_PHOTO_URL, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status == 200:
                raw_img = resp.read()
                if raw_img.startswith(b'\xff\xd8\xff'):
                    photo_bytes = raw_img
    except Exception:
        pass

    if not photo_bytes:
        # High quality gradient photographic specimen
        img = Image.new("RGB", (1200, 800))
        draw = ImageDraw.Draw(img)
        for y in range(800):
            r = int(25 + 40 * (y / 800))
            g = int(35 + 30 * (y / 800))
            b = int(60 + 50 * (y / 800))
            draw.line([(0, y), (1200, y)], fill=(r, g, b))
        draw.ellipse([450, 250, 750, 550], fill=(210, 160, 130), outline=(230, 180, 150), width=4)
        draw.rectangle([100, 700, 1100, 760], fill=(15, 20, 35))
        draw.text((600, 730), "Sony Alpha 7R V • FE 24-70mm F2.8 GM II • ISO 100 • 50mm • f/2.8 • 1/500s", fill=(255, 255, 255), anchor="mm")
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=95)
        photo_bytes = buf.getvalue()
    
    # Construct TIFF header & XMP metadata block
    # Standard TIFF header: Little-endian ('II', 42, offset 8)
    tiff_header = b'II\x2a\x00\x08\x00\x00\x00'
    
    xmp_packet = b"""<?xpacket begin="\xef\xbb\xbf" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description xmlns:tiff="http://ns.adobe.com/tiff/1.0/"
                   xmlns:exif="http://ns.adobe.com/exif/1.0/"
                   xmlns:aux="http://ns.adobe.com/exif/1.0/aux/">
   <tiff:Make>Sony</tiff:Make>
   <tiff:Model>ILCE-7RM5 (A7R V)</tiff:Model>
   <aux:Lens>FE 24-70mm F2.8 GM II</aux:Lens>
   <exif:ISOSpeedRatings>
    <rdf:Seq>
     <rdf:li>100</rdf:li>
    </rdf:Seq>
   </exif:ISOSpeedRatings>
   <exif:ShutterSpeedValue>1/500 sec</exif:ShutterSpeedValue>
   <exif:ApertureValue>f/2.8</exif:ApertureValue>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>"""
    
    with open(out_path, 'wb') as f:
        f.write(tiff_header)
        f.write(xmp_packet)
        # Pad to align
        f.write(b'\x00' * 64)
        f.write(photo_bytes)

def generate_eps_files(adobe_dir: Path):
    """Generates authentic Encapsulated PostScript (.eps) files with XMP thumbnail, DSC metadata, and PostScript vector paths."""
    # 1. EPS with XMP base64 thumbnail + PostScript vector paths
    img = Image.new("RGB", (640, 480), color=(18, 24, 38))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([24, 24, 616, 456], radius=20, outline=(59, 130, 246), width=4)
    draw.polygon([(320, 80), (480, 320), (160, 320)], fill=(245, 158, 11), outline=(217, 119, 6), width=2)
    draw.ellipse([270, 180, 370, 280], fill=(59, 130, 246), outline=(147, 197, 253), width=2)
    draw.text((320, 380), "KV FILES • VECTOR EPS SPECIMEN", fill=(240, 246, 252), anchor="mm")
    thumb_buf = io.BytesIO()
    img.save(thumb_buf, format="JPEG", quality=90)
    thumb_b64 = base64.b64encode(thumb_buf.getvalue()).decode('ascii')

    eps_xmp = f"""%!PS-Adobe-3.0 EPSF-3.0
%%BoundingBox: 0 0 640 480
%%HiResBoundingBox: 0.0000 0.0000 640.0000 480.0000
%%Creator: Adobe Illustrator 28.0 (KV Files Vector Engine)
%%Title: brand_identity_vector.eps
%%CreationDate: 2026-09-16
%%LanguageLevel: 2
%%DocumentProcessColors: Cyan Magenta Yellow Black
%%DocumentCustomColors: (Pantone 2925 C)
%%BeginXMP: <?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:xmpGImg="http://ns.adobe.com/xap/1.0/g/img/">
   <xmp:CreatorTool>Adobe Illustrator 28.0</xmp:CreatorTool>
   <xmpGImg:image>{thumb_b64}</xmpGImg:image>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>
%%EndXMP
%%EndComments
%%BeginProlog
%%EndProlog
%%Page: 1 1
0.23 0.51 0.96 setrgbcolor
4 setlinewidth
24 24 592 432 rectstroke
0.96 0.62 0.04 setrgbcolor
newpath
320 400 moveto
480 160 lineto
160 160 lineto
closepath
fill
0.23 0.51 0.96 setrgbcolor
newpath
320 230 50 0 360 arc
fill
showpage
%%EOF
"""
    (adobe_dir / "brand_identity_vector.eps").write_text(eps_xmp, encoding="latin1")

    # 2. Pure PostScript vector EPS without raster thumbnail (tests client-side vector path interpreter)
    eps_vector = """%!PS-Adobe-3.0 EPSF-3.0
%%BoundingBox: 0 0 500 500
%%HiResBoundingBox: 0.00 0.00 500.00 500.00
%%Creator: KV Files Parametric Vector CAD
%%Title: mechanical_gear_schematic.eps
%%CreationDate: 2026-09-16
%%LanguageLevel: 2
%%DocumentProcessColors: Black
%%EndComments
%%Page: 1 1
0 0 0 setrgbcolor
2 setlinewidth
newpath
40 40 moveto
460 40 lineto
460 460 lineto
40 460 lineto
closepath
stroke
0.1 0.5 0.8 setrgbcolor
newpath
100 100 moveto
250 400 lineto
400 100 lineto
closepath
fill
1 1 1 setrgbcolor
newpath
250 200 60 0 360 arc
fill
0 0 0 setrgbcolor
newpath
250 200 30 0 360 arc
stroke
showpage
%%EOF
"""
    (adobe_dir / "mechanical_gear_schematic.eps").write_text(eps_vector, encoding="latin1")

# ------------------------------------------------------------------------------
# 4. SysVis Architecture Diagrams
# ------------------------------------------------------------------------------
def generate_sysvis_files(target_dir: Path):
    mmd_content = """flowchart TD
    subgraph Clients["Clients & Edge Gateway"]
        Browser["🌐 Web Browser (React PWA)"]
        Mobile["📱 Mobile PWA / Safari iOS"]
        WAF["🛡️ Cloudflare Zero Trust / WAF"]
    end

    subgraph HostSystem["KV Files Host System (Port 8866)"]
        AxumServer["⚡ Rust Axum Web Server"]
        Router["🔀 Tokio API / VFS Router"]
        Watcher["👁️ Linux Kernel inotify Watcher"]
        VFS["📁 Virtual Filesystem Engine"]
        SQLite["💾 Embedded SQLite WAL Database"]
        ExtHost["🧩 Client Extension Host"]
    end

    subgraph StoragePools["Mounted Storage Roots"]
        Photos["📷 /mnt/storage/photos"]
        Docs["📄 /mnt/storage/documents"]
        Backups["🗄️ /mnt/storage/backups"]
    end

    Browser --> WAF
    Mobile --> WAF
    WAF --> AxumServer
    AxumServer --> Router
    Router --> VFS
    Router --> SQLite
    VFS --> Photos
    VFS --> Docs
    VFS --> Backups
    Watcher -.->|"Real-Time Events"| VFS
    VFS -.->|"WebSocket Broadcast"| Browser
    Router --> ExtHost
"""
    (target_dir / "cloud_microservices_architecture.mmd").write_text(mmd_content, encoding="utf-8")

    flow_content = """flowchart LR
    Dev(["🧑‍💻 Developer Commit"]) --> GitRepo["🐙 GitHub Repository"]
    GitRepo --> CI["⚡ GitHub Actions CI"]
    
    subgraph Build["Container & Binary Build"]
        CI --> WebBuild["📦 React Vite PWA Build"]
        CI --> RustBuild["🦀 Cargo Release Binary (x86_64 / aarch64)"]
        WebBuild --> Embed["🗜️ rust-embed Assets"]
        RustBuild --> Embed
    end

    Embed --> Docker["🐳 Multi-Arch Docker Image"]
    Docker --> Registry["📦 GHCR & Docker Hub"]
    Registry --> ArgoCD["🚀 Auto-Deploy Agent"]
    ArgoCD --> Production["🌐 Production Kubernetes Cluster"]
"""
    (target_dir / "kubernetes_gitops_pipeline.flow").write_text(flow_content, encoding="utf-8")

    arch_content = """flowchart TD
    Ingest["📡 Event Ingestion Broker"]
    Kafka{{"⚡ Apache Kafka Event Stream"}}
    
    subgraph Processing["Distributed Stream Processors"]
        Worker1["⚙️ Telemetry Aggregator"]
        Worker2["⚙️ AI Embedding Service"]
        Worker3["⚙️ Notification Worker"]
    end

    subgraph Caching["Cache & Persistence Tier"]
        Redis[("⚡ Redis Cluster")]
        Postgres[("🐘 TimescaleDB Primary")]
    end

    Ingest --> Kafka
    Kafka --> Worker1
    Kafka --> Worker2
    Kafka --> Worker3
    Worker1 --> Redis
    Worker2 --> Postgres
    Worker3 --> Redis
"""
    (target_dir / "distributed_event_stream.arch").write_text(arch_content, encoding="utf-8")

# ------------------------------------------------------------------------------
# 5. Markdown Studio Specimen
# ------------------------------------------------------------------------------
def generate_markdown_specimen(out_path: Path):
    md_content = """# KV Files — Technical Architecture & Extension Spec

Welcome to the **KV Files** extension test document. This markdown specimen tests the Markdown Studio previewer with rich formatting, syntax highlighting, LaTeX mathematics, and interactive Mermaid diagrams.

---

## 1. System Overview & Fast Miller Columns

KV Files fuses the cascading elegance of **macOS Miller Columns** with the precision of **Windows Explorer**:

- **Backend Runtime**: Pure Rust (`axum` + `tokio`)
- **Metadata Persistence**: SQLite in high-concurrency WAL mode
- **Filesystem Synchronizer**: Linux kernel `inotify` streaming events over WebSockets
- **UI Engine**: React PWA with client-side WebAssembly decoders

| Feature | KV Files | FileBrowser | Nextcloud |
| :--- | :---: | :---: | :---: |
| **Idle Memory** | **⚡ ~15 MB RAM** | ~30 MB RAM | 500 MB+ RAM |
| **macOS Miller Columns** | **✅ Yes** | ❌ No | ❌ No |
| **Dual-Pane Split View** | **✅ Yes (`Alt+S`)** | ❌ No | ❌ No |
| **Real-Time Sync** | **✅ Kernel `inotify`** | ⚠️ Polling | ⚠️ Cron |

---

## 2. Advanced Mathematical Equations (KaTeX)

Maxwell's Equations for electromagnetic field propagation:

$$
\\oint_{\\partial \\Sigma} \\mathbf{E} \\cdot d\\boldsymbol{\\ell} = -\\frac{d}{dt} \\iint_{\\Sigma} \\mathbf{B} \\cdot d\\mathbf{S}
$$

$$
\\oint_{\\partial \\Sigma} \\mathbf{B} \\cdot d\\boldsymbol{\\ell} = \\mu_0 \\iint_{\\Sigma} \\mathbf{J} \\cdot d\\mathbf{S} + \\mu_0 \\varepsilon_0 \\frac{d}{dt} \\iint_{\\Sigma} \\mathbf{E} \\cdot d\\mathbf{S}
$$

Gaussian normal distribution probability density function:

$$
f(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} \\exp\\left( -\\frac{(x - \\mu)^2}{2\\sigma^2} \\right)
$$

---

## 3. Architecture Flowchart (Mermaid)

```mermaid
flowchart LR
    User([User Browser]) -->|HTTP Range / WS| Axum[Axum Backend]
    Axum -->|VFS API| Storage[(Local Storage / NAS)]
    Axum -->|Session Auth| DB[(SQLite WAL)]
    Storage -.->|inotify event| Kernel[Linux Kernel]
    Kernel -.->|Push update| Axum
```

---

## 4. Source Code Demonstration

```rust
// Rust Axum HTTP Range & Streaming Handler
use axum::{response::IntoResponse, extract::Query};
use tokio::fs::File;

pub async fn stream_file_handler(
    Query(params): Query<FileParams>,
) -> impl IntoResponse {
    let file = File::open(&params.path).await.expect("File not found");
    // Tokio asynchronous file streamer
    tokio_util::io::ReaderStream::new(file)
}
```

```typescript
// React TypeScript Miller Column Navigation
export const useKeyboardTraverse = () => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') expandActiveColumn();
      if (e.key === 'ArrowLeft') collapseParentColumn();
      if (e.code === 'Space') toggleQuickLookPreview();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);
};
```

---

## 5. Deployment Checklist

- [x] Rust release binary compiled with embedded assets
- [x] Multi-architecture Docker image built (`linux/amd64`, `linux/arm64`)
- [x] Reverse proxy configuration validated (Nginx / Caddy)
- [ ] Hardware transcode acceleration test on NAS
- [ ] TOTP 2-Factor Authentication security review
"""
    out_path.write_text(md_content, encoding="utf-8")

# ------------------------------------------------------------------------------
# 6. Archives & Code Samples
# ------------------------------------------------------------------------------
def generate_archive_bundle(out_path: Path):
    """Generates a multi-tier ZIP bundle."""
    with zipfile.ZipFile(out_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr('README.md', '# Release Assets v2.0\nContains production builds and checksums.')
        zf.writestr('src/main.rs', 'fn main() { println!("Hello KV Files"); }')
        zf.writestr('config/app.toml', '[server]\nhost = "0.0.0.0"\nport = 8866\n')
        zf.writestr('docs/spec.txt', 'Specification document for KV Files v2.0 release.')

def generate_tar_gz_bundle(out_path: Path):
    """Generates a .tar.gz log bundle."""
    files_data = {
        'logs/access_2026_09.log': '2026-09-15 14:00:01 GET /api/v1/fs/list 200 OK\n2026-09-15 14:00:02 GET /api/v1/fs/raw 206 Partial Content\n',
        'logs/error.log': '2026-09-15 12:00:00 [WARN] WebSocket reconnect initiated by client\n',
        'logs/metrics.csv': 'timestamp,cpu_percent,memory_mb\n1726390000,0.1,23.4\n1726390060,0.2,23.5\n',
    }
    with tarfile.open(out_path, 'w:gz') as tar:
        for name, content in files_data.items():
            b = content.encode('utf-8')
            ti = tarfile.TarInfo(name=name)
            ti.size = len(b)
            tar.addfile(ti, io.BytesIO(b))

def generate_code_samples(target_dir: Path):
    rs_code = """// KV Files — Fast In-Memory LRU Cache
use std::collections::HashMap;

pub struct LruCache<K, V> {
    capacity: usize,
    items: HashMap<K, V>,
}

impl<K: Eq + std::hash::Hash, V> LruCache<K, V> {
    pub fn new(capacity: usize) -> Self {
        Self {
            capacity,
            items: HashMap::with_capacity(capacity),
        }
    }
    pub fn get(&self, key: &K) -> Option<&V> {
        self.items.get(key)
    }
}
"""
    (target_dir / "lru_cache.rs").write_text(rs_code, encoding="utf-8")

    ts_code = """// KV Files — Virtual File Tree Node Interface
export interface TreeNode {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  extension: string;
  children?: TreeNode[];
}

export async function fetchDirectoryTree(root: string, path: string): Promise<TreeNode> {
  const response = await fetch(`/api/v1/fs/tree?root=${encodeURIComponent(root)}&path=${encodeURIComponent(path)}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to fetch tree`);
  return response.json();
}
"""
    (target_dir / "file_tree_service.ts").write_text(ts_code, encoding="utf-8")

    py_code = """#!/usr/bin/env python3
\"\"\"KV Files — Background Telemetry Collector\"\"\"
from dataclasses import dataclass
import time

@dataclass
class StorageMetric:
    mount_point: str
    total_bytes: int
    used_bytes: int

    @property
    def free_bytes(self) -> int:
        return self.total_bytes - self.used_bytes

def collect_metrics() -> StorageMetric:
    return StorageMetric(mount_point="/storage", total_bytes=100_000_000_000, used_bytes=32_000_000_000)

if __name__ == "__main__":
    metric = collect_metrics()
    print(f"Free storage: {metric.free_bytes / (1024**3):.2f} GB")
"""
    (target_dir / "telemetry_collector.py").write_text(py_code, encoding="utf-8")

    sql_code = """-- KV Files User & Share Permissions Schema
CREATE TABLE IF NOT EXISTS shares (
    id TEXT PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    root_name TEXT NOT NULL,
    path TEXT NOT NULL,
    is_dir BOOLEAN NOT NULL DEFAULT 0,
    password_hash TEXT,
    expires_at DATETIME,
    view_count INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shares_token ON shares(token);
CREATE INDEX IF NOT EXISTS idx_shares_path ON shares(root_name, path);
"""
    (target_dir / "schema_migrations.sql").write_text(sql_code, encoding="utf-8")

    yaml_code = """apiVersion: apps/v1
kind: Deployment
metadata:
  name: kv-file
  labels:
    app.kubernetes.io/name: kv-file
spec:
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: kv-file
  template:
    metadata:
      labels:
        app.kubernetes.io/name: kv-file
    spec:
      containers:
        - name: kv-file
          image: ghcr.io/vndangkhoa/kv-file:latest
          ports:
            - containerPort: 8866
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "256Mi"
              cpu: "500m"
"""
    (target_dir / "kubernetes_manifest.yaml").write_text(yaml_code, encoding="utf-8")

    tf_code = """terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

resource "aws_s3_bucket" "kv_files_backups" {
  bucket = "kv-files-nas-offsite-backups"
  tags = {
    Environment = "Production"
    ManagedBy   = "Terraform"
  }
}
"""
    (target_dir / "infrastructure_iac.tf").write_text(tf_code, encoding="utf-8")

    # Minified unformatted JSON for testing Quick Look code formatter toggle
    unformatted_json = '{"server":{"hostname":"kv-edge-gateway-01","region":"us-east-1","cluster":{"active_nodes":12,"healthy":true,"nodes":[{"id":"node-1","ip":"10.0.1.10","load":0.42,"memory":{"total":67108864,"used":24580120,"free":42528744},"status":"ONLINE"},{"id":"node-2","ip":"10.0.1.11","load":0.58,"memory":{"total":67108864,"used":38102000,"free":29006864},"status":"ONLINE"},{"id":"node-3","ip":"10.0.1.12","load":0.91,"memory":{"total":67108864,"used":61000200,"free":6108664},"status":"DEGRADED"}]},"storage":{"pools":[{"name":"primary_nvme","mount":"/mnt/nvme0","capacity_gb":4096,"used_gb":1820,"filesystem":"zfs"},{"name":"backup_gluster","mount":"/mnt/gluster","capacity_gb":32768,"used_gb":14200,"filesystem":"glusterfs"}]},"telemetry":{"rps":18420.5,"p95_latency_ms":1.42,"p99_latency_ms":3.88,"error_rate_pct":0.002,"last_restart":"2026-09-15T08:00:00Z"}}}'
    (target_dir / "unformatted_telemetry.json").write_text(unformatted_json, encoding="utf-8")

    # Single-line unformatted SQL for testing Quick Look SQL formatter
    unformatted_sql = "SELECT u.id,u.username,u.email,COUNT(p.id) AS project_count,SUM(f.bytes_used) AS total_storage_bytes,AVG(s.response_ms) AS avg_latency FROM users u INNER JOIN projects p ON u.id=p.owner_id LEFT JOIN files f ON p.id=f.project_id LEFT JOIN server_telemetry s ON u.id=s.user_id WHERE u.status='active' AND p.is_archived=0 GROUP BY u.id,u.username,u.email HAVING COUNT(p.id)>5 ORDER BY total_storage_bytes DESC,u.created_at ASC LIMIT 50 OFFSET 0;"
    (target_dir / "unformatted_query.sql").write_text(unformatted_sql, encoding="utf-8")

# ------------------------------------------------------------------------------
# 8. CorelDRAW Graphics Studio Generator
# ------------------------------------------------------------------------------
def generate_coreldraw_files(corel_dir: Path):
    """Spawns an authentic suite of CorelDRAW files (CDR, CDT, CMX) including modern ZIP packages and legacy RIFF."""
    corel_dir.mkdir(parents=True, exist_ok=True)

    # 1. brand_vector_art.cdr
    img1 = Image.new("RGBA", (1000, 700), "#0f172a")
    d1 = ImageDraw.Draw(img1)
    for x in range(0, 1000, 40): d1.line([(x, 0), (x, 700)], fill="#1e293b", width=1)
    for y in range(0, 700, 40): d1.line([(0, y), (1000, y)], fill="#1e293b", width=1)
    d1.rectangle([(150, 100), (850, 600)], fill="#1e1e24", outline="#10b981", width=3)
    colors = ["#10b981", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b"]
    for i, col in enumerate(colors):
        offset = (i - 2.5) * 45
        d1.ellipse([380 + offset, 160, 620 + offset, 420], outline=col, width=4)
    d1.line([(450, 420), (470, 470)], fill="#94a3b8", width=3)
    d1.line([(550, 420), (530, 470)], fill="#94a3b8", width=3)
    d1.rectangle([(465, 470), (535, 505)], fill="#d97706", outline="#b45309", width=2)
    d1.text((320, 530), "CorelDRAW Graphics Suite - Vector Artboard", fill="#f8fafc")
    d1.text((390, 560), "CMYK 300 DPI - Verified Specimen", fill="#10b981")
    buf1 = io.BytesIO()
    img1.save(buf1, format="PNG")

    meta1 = """<?xml version="1.0" encoding="utf-8"?>
<coreProperties xmlns="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
                xmlns:dc="http://purl.org/dc/elements/1.1/"
                xmlns:dcterms="http://purl.org/dc/terms/">
  <dc:title>CorelDRAW Brand Identity Showcase</dc:title>
  <dc:creator>KV Files Creative Studio</dc:creator>
  <dcterms:created>2026-04-12T10:30:00Z</dcterms:created>
  <dcterms:modified>2026-09-15T16:45:00Z</dcterms:modified>
  <AppVersion>2024 (v24.5)</AppVersion>
  <Pages>2</Pages>
  <Width>1920 px</Width>
  <Height>1080 px</Height>
  <ColorModel>CMYK / sRGB</ColorModel>
</coreProperties>"""

    app1 = """<?xml version="1.0" encoding="UTF-8"?>
<Properties>
  <Application>CorelDRAW Graphics Suite 2024</Application>
  <AppVersion>24.5</AppVersion>
</Properties>"""

    with zipfile.ZipFile(corel_dir / "brand_vector_art.cdr", "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("previews/thumbnail.png", buf1.getvalue())
        z.writestr("metadata/metadata.xml", meta1)
        z.writestr("metadata/app.xml", app1)
        z.writestr("content/root.dat", b"CDR_VECTOR_STREAM")

    # 2. packaging_box_diecut.cdr
    img2 = Image.new("RGBA", (1100, 750), "#18181b")
    d2 = ImageDraw.Draw(img2)
    d2.rectangle([(250, 200), (500, 550)], outline="#10b981", width=2)
    d2.rectangle([(500, 200), (650, 550)], outline="#10b981", width=2)
    d2.rectangle([(650, 200), (900, 550)], outline="#10b981", width=2)
    d2.rectangle([(100, 200), (250, 550)], outline="#10b981", width=2)
    d2.line([(100, 200), (60, 240), (60, 510), (100, 550)], fill="#ec4899", width=2)
    d2.rectangle([(250, 80), (500, 200)], outline="#38bdf8", width=2)
    d2.rectangle([(250, 550), (500, 670)], outline="#38bdf8", width=2)
    d2.rectangle([(650, 80), (900, 200)], outline="#38bdf8", width=2)
    d2.rectangle([(650, 550), (900, 670)], outline="#38bdf8", width=2)
    d2.polygon([(100, 200), (100, 120), (200, 150), (250, 200)], outline="#eab308")
    d2.polygon([(500, 200), (550, 150), (650, 120), (650, 200)], outline="#eab308")
    d2.text((280, 240), "LUXURY COSMETICS CARTON", fill="#ffffff")
    d2.text((320, 280), "FRONT DISPLAY PANEL", fill="#94a3b8")
    d2.text((280, 480), "350 GSM SBS BOARD", fill="#10b981")
    d2.line([(100, 710), (150, 710)], fill="#10b981", width=3)
    d2.text((160, 703), "Cut Line", fill="#e4e4e7")
    d2.line([(280, 710), (330, 710)], fill="#ec4899", width=2)
    d2.text((340, 703), "Crease / Score Line", fill="#e4e4e7")
    d2.line([(520, 710), (570, 710)], fill="#38bdf8", width=2)
    d2.text((580, 703), "Bleed Boundary (+3mm)", fill="#e4e4e7")
    cmyk_colors = ["#00ffff", "#ff00ff", "#ffff00", "#000000", "#10b981", "#6366f1"]
    for i, c in enumerate(cmyk_colors):
        d2.rectangle([(750 + i * 45, 695), (785 + i * 45, 725)], fill=c)
    buf2 = io.BytesIO()
    img2.save(buf2, format="PNG")

    meta2 = """<?xml version="1.0" encoding="utf-8"?>
<coreProperties xmlns="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
                xmlns:dc="http://purl.org/dc/elements/1.1/"
                xmlns:dcterms="http://purl.org/dc/terms/">
  <dc:title>Luxury Cosmetic Box Packaging Diecut</dc:title>
  <dc:creator>PackDesign Studios Intl</dc:creator>
  <dcterms:created>2026-06-01T09:15:00Z</dcterms:created>
  <dcterms:modified>2026-09-14T14:20:00Z</dcterms:modified>
  <AppVersion>CorelDRAW 2024</AppVersion>
  <Pages>2</Pages>
  <Width>450 mm</Width>
  <Height>320 mm</Height>
  <ColorModel>CMYK + Spot Green (Pantone 347 C)</ColorModel>
</coreProperties>"""

    with zipfile.ZipFile(corel_dir / "packaging_box_diecut.cdr", "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("previews/thumbnail.png", buf2.getvalue())
        z.writestr("metadata/metadata.xml", meta2)
        z.writestr("metadata/app.xml", app1)
        z.writestr("content/root.dat", b"CDR_PACKAGING_DIECUT_STREAM")

    # 3. vintage_badge_emblem.cdr
    img3 = Image.new("RGBA", (900, 900), "#1c1917")
    d3 = ImageDraw.Draw(img3)
    d3.ellipse([(100, 100), (800, 800)], outline="#d97706", width=4)
    d3.ellipse([(130, 130), (770, 770)], outline="#b45309", width=2)
    d3.ellipse([(180, 180), (720, 720)], outline="#f59e0b", width=1)
    import math
    for deg in range(0, 360, 15):
        rad = math.radians(deg)
        x1 = 450 + math.cos(rad) * 200
        y1 = 450 + math.sin(rad) * 200
        x2 = 450 + math.cos(rad) * 270
        y2 = 450 + math.sin(rad) * 270
        d3.line([(x1, y1), (x2, y2)], fill="#78350f", width=2)
    d3.rectangle([(150, 410), (750, 490)], fill="#d97706", outline="#fef3c7", width=3)
    d3.polygon([(110, 450), (150, 410), (150, 490)], fill="#b45309")
    d3.polygon([(790, 450), (750, 410), (750, 490)], fill="#b45309")
    d3.text((450, 450), "HANDCRAFTED HERITAGE", fill="#1c1917", anchor="mm")
    d3.text((450, 340), "EST. 1989", fill="#fbbf24", anchor="mm")
    d3.text((450, 560), "100% PURE VECTOR ARTWORK", fill="#fde68a", anchor="mm")
    for star_x in [330, 370, 410, 450, 490, 530, 570]:
        d3.text((star_x, 600), "★", fill="#f59e0b", anchor="mm")
    buf3 = io.BytesIO()
    img3.save(buf3, format="PNG")

    meta3 = """<?xml version="1.0" encoding="utf-8"?>
<coreProperties xmlns="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
                xmlns:dc="http://purl.org/dc/elements/1.1/"
                xmlns:dcterms="http://purl.org/dc/terms/">
  <dc:title>Artisan Heritage Badge &amp; Vector Emblem</dc:title>
  <dc:creator>Vintage Vector Lab</dc:creator>
  <dcterms:created>2026-03-10T08:00:00Z</dcterms:created>
  <dcterms:modified>2026-08-20T11:40:00Z</dcterms:modified>
  <AppVersion>CorelDRAW 2022 (v24.0)</AppVersion>
  <Pages>1</Pages>
  <Width>120 mm</Width>
  <Height>120 mm</Height>
  <ColorModel>Spot Color &amp; Monochrome</ColorModel>
</coreProperties>"""

    with zipfile.ZipFile(corel_dir / "vintage_badge_emblem.cdr", "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("previews/thumbnail.png", buf3.getvalue())
        z.writestr("metadata/metadata.xml", meta3)
        z.writestr("metadata/app.xml", app1)
        z.writestr("content/root.dat", b"CDR_VINTAGE_EMBLEM_STREAM")

    # 4. corporate_stationery_template.cdt
    img4 = Image.new("RGBA", (1000, 750), "#0f172a")
    d4 = ImageDraw.Draw(img4)
    d4.rectangle([(100, 100), (450, 600)], fill="#ffffff", outline="#334155", width=2)
    d4.rectangle([(120, 120), (220, 150)], fill="#0284c7")
    d4.line([(120, 200), (430, 200)], fill="#e2e8f0", width=2)
    d4.line([(120, 230), (410, 230)], fill="#e2e8f0", width=2)
    d4.line([(120, 260), (380, 260)], fill="#e2e8f0", width=2)
    d4.rectangle([(550, 120), (900, 320)], fill="#1e293b", outline="#0284c7", width=2)
    d4.text((725, 200), "EXECUTIVE CARD", fill="#38bdf8", anchor="mm")
    d4.text((725, 230), "CorelDRAW Vector Template", fill="#94a3b8", anchor="mm")
    d4.rectangle([(550, 380), (900, 580)], fill="#0284c7", outline="#ffffff", width=2)
    d4.text((725, 480), "BRAND LOGOMARK", fill="#ffffff", anchor="mm")
    d4.text((500, 670), "CORPORATE STATIONERY SYSTEM (CDT TEMPLATE)", fill="#38bdf8", anchor="mm")
    buf4 = io.BytesIO()
    img4.save(buf4, format="PNG")

    meta4 = """<?xml version="1.0" encoding="utf-8"?>
<coreProperties xmlns="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
                xmlns:dc="http://purl.org/dc/elements/1.1/"
                xmlns:dcterms="http://purl.org/dc/terms/">
  <dc:title>Corporate Identity Stationery Suite Template</dc:title>
  <dc:creator>Enterprise Brand Strategy</dc:creator>
  <dcterms:created>2026-05-18T14:00:00Z</dcterms:created>
  <dcterms:modified>2026-09-02T17:10:00Z</dcterms:modified>
  <AppVersion>CorelDRAW Graphics Suite 2024</AppVersion>
  <Pages>3</Pages>
  <Width>210 mm</Width>
  <Height>297 mm</Height>
  <ColorModel>CMYK Pantone Process</ColorModel>
</coreProperties>"""

    with zipfile.ZipFile(corel_dir / "corporate_stationery_template.cdt", "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("previews/thumbnail.png", buf4.getvalue())
        z.writestr("metadata/metadata.xml", meta4)
        z.writestr("metadata/app.xml", app1)
        z.writestr("content/root.dat", b"CDT_STATIONERY_TEMPLATE_STREAM")

    # 5. industrial_laser_cut_blueprint.cmx
    img5 = Image.new("RGBA", (1050, 700), "#030712")
    d5 = ImageDraw.Draw(img5)
    for x in range(0, 1050, 30): d5.line([(x, 0), (x, 700)], fill="#111827", width=1)
    for y in range(0, 700, 30): d5.line([(0, y), (1050, y)], fill="#111827", width=1)
    d5.rectangle([(80, 80), (970, 620)], outline="#2563eb", width=2)
    d5.ellipse([(150, 150), (450, 450)], outline="#f43f5e", width=2)
    d5.ellipse([(250, 250), (350, 350)], outline="#f43f5e", width=2)
    d5.polygon([(520, 150), (900, 150), (900, 350), (700, 350), (700, 250), (520, 250)], outline="#38bdf8", width=2)
    d5.polygon([(520, 380), (900, 380), (800, 580), (520, 580)], outline="#38bdf8", width=2)
    for hx, hy in [(560, 190), (620, 190), (840, 190), (840, 300), (560, 440), (620, 440), (700, 520)]:
        d5.ellipse([(hx - 15, hy - 15), (hx + 15, hy + 15)], outline="#10b981", width=2)
    d5.text((100, 640), "CNC LASER CUTTING NESTING MAP • 3.0mm SS316L", fill="#f43f5e")
    d5.text((700, 640), "SCALE: 1:1 • CMYK VECTOR PATHS", fill="#38bdf8")
    buf5 = io.BytesIO()
    img5.save(buf5, format="PNG")

    meta5 = """<?xml version="1.0" encoding="utf-8"?>
<coreProperties xmlns="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
                xmlns:dc="http://purl.org/dc/elements/1.1/"
                xmlns:dcterms="http://purl.org/dc/terms/">
  <dc:title>CNC Sheet Metal Laser Cutting Nesting Map</dc:title>
  <dc:creator>Precision Fabrication Eng</dc:creator>
  <dcterms:created>2026-07-22T11:20:00Z</dcterms:created>
  <dcterms:modified>2026-09-10T15:30:00Z</dcterms:modified>
  <AppVersion>Corel Presentation Exchange (CMX)</AppVersion>
  <Pages>1</Pages>
  <Width>1200 mm</Width>
  <Height>800 mm</Height>
  <ColorModel>Vector Path Overlay</ColorModel>
</coreProperties>"""

    with zipfile.ZipFile(corel_dir / "industrial_laser_cut_blueprint.cmx", "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("previews/thumbnail.png", buf5.getvalue())
        z.writestr("metadata/metadata.xml", meta5)
        z.writestr("metadata/app.xml", app1)
        z.writestr("content/root.dat", b"CMX_LASER_NESTING_STREAM")

    # 6. legacy_catalog_cover_v12.cdr (Binary RIFF container with DISP chunk)
    import struct
    rw, rh = 500, 380
    r_img = Image.new("RGB", (rw, rh), "#064e3b")
    rd = ImageDraw.Draw(r_img)
    rd.rectangle([(15, 15), (rw - 15, rh - 15)], outline="#34d399", width=3)
    rd.ellipse([(120, 60), (380, 200)], outline="#6ee7b7", width=2)
    rd.text((rw // 2, 130), "CorelDRAW 12.0", fill="#ecfdf5", anchor="mm")
    rd.text((rw // 2, 250), "RETRO HARDWARE CATALOGUE", fill="#ffffff", anchor="mm")
    rd.text((rw // 2, 285), "Official RIFF DISP DIB Specimen", fill="#a7f3d0", anchor="mm")
    rd.text((rw // 2, 320), "FOURCC: CDRC (CorelDRAW 12)", fill="#6ee7b7", anchor="mm")

    row_bytes = (rw * 3 + 3) & ~3
    pixel_data = bytearray(row_bytes * rh)
    for y in range(rh):
        img_y = rh - 1 - y
        for x in range(rw):
            r, g, b = r_img.getpixel((x, img_y))
            idx = y * row_bytes + x * 3
            pixel_data[idx] = b
            pixel_data[idx + 1] = g
            pixel_data[idx + 2] = r

    info_header = struct.pack("<IIIHHIIIIII", 40, rw, rh, 1, 24, 0, len(pixel_data), 2835, 2835, 0, 0)
    dib = info_header + pixel_data
    disp_payload = struct.pack("<I", 1) + dib
    disp_chunk = b"DISP" + struct.pack("<I", len(disp_payload)) + disp_payload
    if len(disp_payload) % 2 != 0:
        disp_chunk += b"\x00"

    riff_payload = b"CDRC" + disp_chunk
    riff_file = b"RIFF" + struct.pack("<I", len(riff_payload)) + riff_payload
    (corel_dir / "legacy_catalog_cover_v12.cdr").write_bytes(riff_file)

# ------------------------------------------------------------------------------
# 7. Main Spawn Routine
# ------------------------------------------------------------------------------
def spawn_all_mock_files(base_dir: Path):
    project_root = get_project_root()
    storage_dir = base_dir
    print(f"🚀 Spawning mock file extensions test suite at: {storage_dir}")
    
    # Category 1: CAD & 3D Engineering
    cad_dir = ensure_dir(storage_dir / "01_cad_and_3d")
    print("  📁 Generating 01_cad_and_3d...")
    
    dxf_dest = cad_dir / "flange_bracket_2d.dxf"
    generate_dxf_file(dxf_dest)
    print("    ✔ Generated precision mechanical CAD DXF: flange_bracket_2d.dxf")

    step_dest = cad_dir / "planetary_gearbox.step"
    if not download_url_to_file(DOWNLOAD_SOURCES["planetary_gearbox.step"], step_dest):
        generate_step_file(step_dest)
    else:
        print("    ✔ Downloaded authentic STEP model: planetary_gearbox.step")

    ifc_dest = cad_dir / "commercial_office_building.ifc"
    if not download_url_to_file(DOWNLOAD_SOURCES["commercial_office_building.ifc"], ifc_dest):
        generate_ifc_file(ifc_dest)
    else:
        print("    ✔ Downloaded authentic BIM IFC building: commercial_office_building.ifc")

    stl_dest = cad_dir / "turbine_mounting_bracket.stl"
    if not download_url_to_file(DOWNLOAD_SOURCES["turbine_mounting_bracket.stl"], stl_dest):
        generate_stl_file(stl_dest)
    else:
        print("    ✔ Downloaded authentic STL 3D mesh: turbine_mounting_bracket.stl")

    generate_obj_file(cad_dir / "lowpoly_shuttle.obj")
    
    # Real DWG from existing projects if present
    dwg_src = project_root / "storage" / "projects" / "DienGF.dwg"
    if dwg_src.exists():
        shutil.copy2(dwg_src, cad_dir / "architectural_floorplan.dwg")
        print("    ✔ Copied real AutoCAD DWG: architectural_floorplan.dwg")

    # Category 2: Adobe Creative Suite
    adobe_dir = ensure_dir(storage_dir / "02_adobe_suite")
    print("  📁 Generating 02_adobe_suite...")
    
    idml_dest = adobe_dir / "magazine_editorial.idml"
    if not download_url_to_file(DOWNLOAD_SOURCES["magazine_editorial.idml"], idml_dest):
        generate_idml_file(idml_dest)
    else:
        print("    ✔ Downloaded authentic InDesign IDML publication: magazine_editorial.idml")

    generate_xd_file(adobe_dir / "mobile_app_ux.xd")

    prproj_dest = adobe_dir / "commercial_cut_v4.prproj"
    if not download_url_to_file(DOWNLOAD_SOURCES["commercial_cut_v4.prproj"], prproj_dest):
        generate_prproj_file(prproj_dest)
    else:
        print("    ✔ Downloaded authentic Premiere Pro PRPROJ: commercial_cut_v4.prproj")

    aepx_dest = adobe_dir / "motion_graphics_intro.aepx"
    if not download_url_to_file(DOWNLOAD_SOURCES["motion_graphics_intro.aepx"], aepx_dest):
        generate_aepx_file(aepx_dest)
    else:
        print("    ✔ Downloaded authentic After Effects AEPX: motion_graphics_intro.aepx")

    generate_dng_file(adobe_dir / "studio_portrait_raw.dng")
    print("    ✔ Generated authentic Sony A7R V DNG RAW photo: studio_portrait_raw.dng")
    
    # Real PSD & AI from existing projects
    psd_src = project_root / "storage" / "projects" / "30112629_7654298.psd"
    if psd_src.exists():
        shutil.copy2(psd_src, adobe_dir / "brand_identity_artboard.psd")
        print("    ✔ Copied real Photoshop PSD: brand_identity_artboard.psd")
        
    ai_src = project_root / "storage" / "projects" / "DarkTech_Screen.ai"
    if ai_src.exists():
        shutil.copy2(ai_src, adobe_dir / "vector_graphics_showcase.ai")
        print("    ✔ Copied real Illustrator AI: vector_graphics_showcase.ai")

    generate_eps_files(adobe_dir)
    print("    ✔ Generated Encapsulated PostScript vector files: brand_identity_vector.eps & mechanical_gear_schematic.eps")

    # Category 3: Typography & Fonts
    fonts_dir = ensure_dir(storage_dir / "03_typography_fonts")
    print("  📁 Generating 03_typography_fonts...")
    ttf_src = project_root / "storage" / "media" / "LiberationSans-Regular.ttf"
    if ttf_src.exists():
        shutil.copy2(ttf_src, fonts_dir / "LiberationSans-Regular.ttf")
        print("    ✔ Copied TTF font: LiberationSans-Regular.ttf")
        
    otf_candidates = [
        Path("/usr/share/fonts/opentype/urw-base35/URWBookman-Light.otf"),
        Path("/usr/share/fonts/opentype/font-awesome/FontAwesome.otf"),
        Path("/usr/share/fonts/opentype/urw-base35/P052-Roman.otf")
    ]
    for otf in otf_candidates:
        if otf.exists():
            shutil.copy2(otf, fonts_dir / otf.name)
            print(f"    ✔ Copied OTF font: {otf.name}")
            break

    woff_src = project_root / "web" / "dist" / "docs" / "docs" / "fonts" / "KaTeX_Main-BoldItalic.woff"
    if woff_src.exists():
        shutil.copy2(woff_src, fonts_dir / "KaTeX_Main.woff")
        print("    ✔ Copied WOFF font: KaTeX_Main.woff")

    woff2_src = project_root / "web" / "dist" / "docs" / "docs" / "fonts" / "material-symbols-outlined.woff2"
    if woff2_src.exists():
        shutil.copy2(woff2_src, fonts_dir / "MaterialSymbols.woff2")
        print("    ✔ Copied WOFF2 font: MaterialSymbols.woff2")

    # Category 4: SysVis Architecture Flowcharts
    sysvis_dir = ensure_dir(storage_dir / "04_sysvis_diagrams")
    print("  📁 Generating 04_sysvis_diagrams...")
    generate_sysvis_files(sysvis_dir)

    # Category 5: Markdown Studio
    md_dir = ensure_dir(storage_dir / "05_markdown_studio")
    print("  📁 Generating 05_markdown_studio...")
    generate_markdown_specimen(md_dir / "interactive_developer_spec.md")

    # Category 6: Archives & Packages
    archives_dir = ensure_dir(storage_dir / "06_archives")
    print("  📁 Generating 06_archives...")
    generate_archive_bundle(archives_dir / "release_v2.0_bundle.zip")
    generate_tar_gz_bundle(archives_dir / "server_telemetry_logs.tar.gz")

    # Category 7: Code & Configs
    code_dir = ensure_dir(storage_dir / "07_code_and_configs")
    print("  📁 Generating 07_code_and_configs...")
    generate_code_samples(code_dir)

    # Category 8: CorelDRAW Graphics Studio
    corel_dir = ensure_dir(storage_dir / "08_coreldraw")
    print("  📁 Generating 08_coreldraw...")
    generate_coreldraw_files(corel_dir)

    print("\n✨ All mock file extensions have been successfully spawned!")
    print(f"👉 Access them directly in KV Files at: http://localhost:8866/ (under mock_extensions/)")

def main():
    parser = argparse.ArgumentParser(description="Spawn mock file extensions for testing KV Files.")
    parser.add_argument("--clean", action="store_true", help="Remove spawned mock_extensions directory")
    parser.add_argument("--target-dir", type=str, default=None, help="Target directory (default: <project_root>/storage/mock_extensions)")
    args = parser.parse_args()

    project_root = get_project_root()
    target_dir = Path(args.target_dir) if args.target_dir else (project_root / "storage" / "mock_extensions")

    if args.clean:
        if target_dir.exists():
            print(f"🧹 Removing mock extensions directory: {target_dir}")
            shutil.rmtree(target_dir)
            print("✔ Clean completed.")
        else:
            print(f"ℹ Directory does not exist: {target_dir}")
        return

    spawn_all_mock_files(target_dir)

if __name__ == "__main__":
    main()
