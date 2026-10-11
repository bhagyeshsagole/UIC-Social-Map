# Refresh the ODbL snapshot; normalize with frontend/scripts/import-nearby-places.mjs.
import urllib.request,urllib.parse,json
from pathlib import Path
q='[out:json][timeout:90];('
for lat,lon in [(41.871967,-87.647964)]:
 for key,values in [('amenity','cafe|restaurant|fast_food|food_court|ice_cream|library|bar|pub'),('shop','hairdresser|beauty|bakery|supermarket|convenience|books|laundry')]:
  q+=f'nwr(41.8410,-87.7150,41.9020,-87.6080)[{key}~"^({values})$"][name];'
q+=');out center tags;'
for host in ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter']:
 try:
  req=urllib.request.Request(host+'?'+urllib.parse.urlencode({'data':q}),headers={'User-Agent':'Kampuscape/1.0 places research','Accept':'application/json'})
  d=json.load(urllib.request.urlopen(req,timeout=120));assert 'elements' in d
  open(Path(__file__).resolve().parents[1]/'places/uic-nearby-osm.json','w').write(json.dumps(d));print('Source places:',len(d['elements']));break
 except Exception as e:print(type(e).__name__,str(e))

else:
 raise SystemExit("No valid source response; existing snapshot preserved.")
