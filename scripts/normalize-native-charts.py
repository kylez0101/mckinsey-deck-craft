"""Explicit OOXML label/marker formatting for this native chart gallery.
Only modifies chart presentation properties; cached values and workbooks remain intact.
"""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from copy import deepcopy
from lxml import etree as E
import sys, json
C='http://schemas.openxmlformats.org/drawingml/2006/chart'
A='http://schemas.openxmlformats.org/drawingml/2006/main'
ns={'c':C,'a':A}
def q(n): return '{'+C+'}'+n
def aq(n):return '{'+A+'}'+n
def setflag(el,name,value):
 old=el.find(q(name))
 if old is not None:el.remove(old)
 E.SubElement(el,q(name),val=str(int(value)))
def labels(ser,scatter):
 d=ser.find(q('dLbls'))
 if d is None:return
 value_node=ser.find(q('yVal' if scatter else 'val'))
 values=[] if value_node is None else value_node.findall('.//c:pt',ns)
 current={int(x.find(q('idx')).get('val')):x for x in d.findall(q('dLbl'))}
 flags=['showLegendKey','showVal','showCatName','showSerName','showPercent','showBubbleSize']
 defaults={k:d.find(q(k)).get('val')=='1' if d.find(q(k)) is not None else False for k in flags}
 for i in range(len(values)):
  label=current.get(i)
  if label is None:
   label=E.Element(q('dLbl'));E.SubElement(label,q('idx'),val=str(i));d.insert(i,label)
  custom=label.find(q('tx')) is not None
  show=label.find(q('showVal'))
  hidden=not custom and not (show.get('val')=='1' if show is not None else defaults['showVal']) and not defaults['showSerName']
  if hidden:
   # Complete false flags render consistently in Office and the preview engine.
   delete=label.find(q('delete'))
   if delete is not None:label.remove(delete)
  else:
   # Per-point overrides must not invoke PowerPoint's auto label content defaults.
   for prop in ['numFmt','txPr','dLblPos']:
    if label.find(q(prop)) is None and d.find(q(prop)) is not None:label.append(deepcopy(d.find(q(prop))))
  for k in flags:
   val=False if custom or hidden else defaults[k]
   existing=label.find(q(k))
   if existing is not None and not (custom or hidden):val=existing.get('val')=='1'
   setflag(label,k,val)
  if not custom:
   sep=d.find(q('separator'))
   if sep is not None and label.find(q('separator')) is None:label.append(deepcopy(sep))
 # Root settings remain false where this deck uses only custom point labels.
 if scatter:
  for k in flags:setflag(d,k,False)
 for x in list(d):
  if x.tag==q('showLeaderLines'):d.remove(x)
 E.SubElement(d,q('showLeaderLines'),val='0')
def markerstyle(marker,color):
 sp=marker.find(q('spPr'))
 if sp is None:sp=E.SubElement(marker,q('spPr'))
 for ch in list(sp):sp.remove(ch)
 sf=E.SubElement(sp,aq('solidFill'));E.SubElement(sf,aq('srgbClr'),val=color)
 ln=E.SubElement(sp,aq('ln'),w='9525');sf=E.SubElement(ln,aq('solidFill'));E.SubElement(sf,aq('srgbClr'),val=color)
def fix(root):
 for ser in root.findall('.//c:ser',ns):
  scatter=ser.getparent().tag==q('scatterChart')
  labels(ser,scatter)
  if ser.getparent().tag not in [q('scatterChart'),q('lineChart'),q('line3DChart')]:continue
  marker=ser.find(q('marker'))
  if marker is None:continue
  color=marker.find('c:spPr/a:solidFill/a:srgbClr',ns)
  if color is None:continue
  markerstyle(marker,color.get('val'))
  series_sp=ser.find(q('spPr'))
  if series_sp is not None and series_sp.find(aq('solidFill')) is None:
   sf=E.Element(aq('solidFill'));E.SubElement(sf,aq('srgbClr'),val=color.get('val'));series_sp.insert(0,sf)
  for pt in ser.findall(q('dPt')):
   color=pt.find('c:spPr/a:solidFill/a:srgbClr',ns)
   if color is None:continue
   m=pt.find(q('marker'))
   if m is None:
    m=deepcopy(marker);pt.insert(1,m)
   markerstyle(m,color.get('val'))
 for chart in root.findall('.//c:scatterChart',ns):
  ds=chart.find(q('dLbls'))
  if ds is not None:
   for k in ['showLegendKey','showVal','showCatName','showSerName','showPercent','showBubbleSize']:setflag(ds,k,False)
def canonical_order(root):
 # CT_DLbl/CT_DLbls choose deletion OR label properties, not both.
 for element in root.findall('.//c:dLbl',ns)+root.findall('.//c:dLbls',ns):
  delete=element.find(q('delete'))
  if delete is not None:
   if delete.get('val')=='1':
    for ch in list(element):
     if ch.tag not in [q('idx'),q('dLbl'),q('delete'),q('extLst')]:element.remove(ch)
   else:element.remove(delete)
 orders={
 'dLbls':['dLbl','delete','numFmt','spPr','txPr','dLblPos','showLegendKey','showVal','showCatName','showSerName','showPercent','showBubbleSize','separator','showLeaderLines','leaderLines','extLst'],
 'dLbl':['idx','delete','layout','tx','numFmt','spPr','txPr','dLblPos','showLegendKey','showVal','showCatName','showSerName','showPercent','showBubbleSize','separator','extLst'],
 'marker':['symbol','size','spPr','extLst'],
 'dPt':['idx','invertIfNegative','marker','bubble3D','explosion','spPr','pictureOptions','extLst']}
 for tag,order in orders.items():
  for element in root.findall('.//c:'+tag,ns):
   children=list(element)
   children.sort(key=lambda x:order.index(E.QName(x).localname) if E.QName(x).localname in order else 999)
   element[:]=children
src,dst=map(Path,sys.argv[1:3]);assert src.resolve()!=dst.resolve();dst.parent.mkdir(parents=True,exist_ok=True)
changed=[]
with ZipFile(src) as zin,ZipFile(dst,'w',ZIP_DEFLATED) as zout:
 for info in zin.infolist():
  raw=zin.read(info.filename)
  if '/charts/chart' in info.filename and info.filename.endswith('.xml'):
   root=E.fromstring(raw);fix(root);canonical_order(root);raw=E.tostring(root,encoding='UTF-8',xml_declaration=True,standalone=True);changed.append(info.filename)
  zout.writestr(info,raw)
print(json.dumps({'charts_formatted':len(changed),'values_and_workbooks':'unchanged'},ensure_ascii=False))
