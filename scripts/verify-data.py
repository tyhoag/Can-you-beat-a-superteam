"""Verify every bundled displayed fact against the actual downloaded CSV input."""
import csv,json,sys
source={(r['player_id'],int(r['season']),r['team']):r for r in csv.DictReader(open(sys.argv[1])) if r['lg']=='NBA'}
players=json.load(open('src/players.json'))
fields={'points':'pts_per_game','rebounds':'trb_per_game','assists':'ast_per_game','steals':'stl_per_game','blocks':'blk_per_game','fg':'fg_percent','three':'x3p_percent','threeAttempts':'x3pa_per_game','ft':'ft_percent'}
for p in players:
 r=source[p['id'],p['season'],p['team']]
 assert p['name']==r['player'] and p['position']==r['pos'] and p['games']==int(r['g'])
 for key,column in fields.items():
  expected=None if r[column] in ('NA','') else float(r[column])
  assert p[key]==expected,(p['key'],key,p[key],expected)
assert json.load(open('public/players.json'))==players
print(f"Verified all {len(players)} records and {len(players)*len(fields)} numeric fields against source; download copy matches.")
