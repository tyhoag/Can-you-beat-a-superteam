"""Build the offline historical draft dataset from attributed, public factual records.
Download the two source CSVs separately (see docs/DATA.md), then:
python scripts/bundle-data.py /tmp/player-stats.csv /tmp/team-abbrev.csv
No network requests or third-party code are embedded in the game.
"""
import csv,json,sys,math,hashlib
from pathlib import Path
from collections import defaultdict
stats_path,teams_path=sys.argv[1:]
rows=list(csv.DictReader(open(stats_path)))
team_names={(int(r['season']),r['abbreviation']):r['team'] for r in csv.DictReader(open(teams_path)) if r['lg']=='NBA'}
def num(r,k):
 v=r[k]
 return None if v in ('NA','') else float(v)
def score(p):
 clamp=lambda v,a,b:max(a,min(b,v))
 rim=clamp(45+p['fg']*65+p['points']*.25,50,98)
 ran=clamp(38+(p['three'] if p['three'] is not None else .25)*110,40,98) if (p['threeAttempts'] or 0)>=1 else clamp(30+(p['ft'] if p['ft'] is not None else .7)*35,40,65)
 cre=clamp(45+p['assists']*4.2,45,98)
 de=65 if p['steals'] is None or p['blocks'] is None else clamp(40+p['steals']*10+p['blocks']*9+p['rebounds']*.8,40,98)
 return .32*rim+.22*ran+.2*cre+.26*de
pools=defaultdict(dict)
for r in rows:
 year=int(r['season']);team=r['team']
 if r['lg']!='NBA' or not 1960<=year<=2024 or int(r['g'])<20 or (year,team) not in team_names or r['pos']=='NA':continue
 p=dict(id=r['player_id'],name=r['player'],era=year//10*10,season=year,position=r['pos'],team=team,teamName=team_names[year,team],games=int(r['g']),points=num(r,'pts_per_game'),rebounds=num(r,'trb_per_game'),assists=num(r,'ast_per_game'),steals=num(r,'stl_per_game'),blocks=num(r,'blk_per_game'),fg=num(r,'fg_percent'),three=num(r,'x3p_percent'),threeAttempts=num(r,'x3pa_per_game'),ft=num(r,'ft_percent'))
 if p['fg'] is None or p['rebounds'] is None:continue
 p['source']=f"https://www.basketball-reference.com/players/{p['id'][0]}/{p['id']}.html"
 p['key']=f"{p['id']}-{year}-{team}"
 group=pools[p['era'],team]
 if p['id'] not in group or (score(p),p['season'])>(score(group[p['id']]),group[p['id']]['season']):group[p['id']]=p
out=[];sizes=[];choice_gaps=[];coverage=defaultdict(int)
for key,group in sorted(pools.items()):
 candidates=sorted(group.values(),key=lambda p:(-score(p),p['id']))
 # Guarantee a range of positions in the retained candidate pool, then add strength.
 selected=[]
 for pos in ['PG','SG','SF','PF','C']:
  match=next((p for p in candidates if p['position']==pos and p not in selected),None)
  if match:selected.append(match)
 for p in candidates:
  if len(selected)>=12:break
  if p not in selected:selected.append(p)
 if len(selected)<9:raise ValueError(('Not enough duplicate-safe candidates',key,len(selected)))
 # Preserve the original selection (and every saved roster key), then guarantee
 # three different identities at each position wherever the source supports it.
 for pos in ['PG','SG','SF','PF','C']:
  choices=[p for p in candidates if p['position']==pos][:3]
  for p in choices:
   if p not in selected:selected.append(p)
  coverage[len(choices)]+=1
  if len(choices)<3:
   choice_gaps.append(dict(era=key[0],team=key[1],teamName=candidates[0]['teamName'],position=pos,available=len(choices)))
 out.extend(sorted(selected,key=lambda p:(-score(p),p['id'])))
 sizes.append((key,len(selected)))
Path('src/players.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':'))+'\n')
Path('public/players.json').write_text(Path('src/players.json').read_text())
report={'records':len(out),'uniquePlayers':len(set(p['id'] for p in out)),'teamDecadePools':len(sizes),'teams':len(set(p['team'] for p in out)),'earliestSeason':min(p['season'] for p in out),'latestSeason':max(p['season'] for p in out),'sourceSha256':hashlib.sha256(Path(stats_path).read_bytes()).hexdigest(),'teamsSourceSha256':hashlib.sha256(Path(teams_path).read_bytes()).hexdigest(),'unavailableSteals':sum(p['steals'] is None for p in out),'unavailableBlocks':sum(p['blocks'] is None for p in out)}
report.update(draftChoicesPerPosition=3,positionChoiceCoverage=dict(sorted(coverage.items())),positionChoiceGaps=choice_gaps)
Path('docs/data-manifest.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
