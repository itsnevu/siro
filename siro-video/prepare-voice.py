"""Generate the chosen calm female English voice, as individually timed phrases."""
import asyncio, pathlib, subprocess, json
import edge_tts

ROOT=pathlib.Path(__file__).parent
OUT=ROOT/'public'/'audio'
PHRASES=[
 ('01-strategy','Your strategy.','-8%','-2Hz',0.30),
 ('02-autonomous','Now autonomous.','-4%','+0Hz',1.55),
 ('03-idea','Start with an idea.','-3%','+1Hz',3.55),
 ('04-agent','Siro builds your agent.','-2%','+0Hz',5.75),
 ('05-limits','Your limits.','-8%','-2Hz',8.55),
 ('06-moves','Every move, within them.','-5%','-1Hz',10.05),
 ('07-ready','Ready when you are.','-5%','+0Hz',13.65),
 ('08-siro','Siro. Your strategy, in motion.','+1%','-2Hz',16.70),
]
async def main():
 OUT.mkdir(parents=True,exist_ok=True)
 sem=asyncio.Semaphore(2)
 async def create(row):
  name,text,rate,pitch,start=row
  async with sem:
   raw=OUT/(name+'-raw.mp3')
   await edge_tts.Communicate(text,'en-US-AvaMultilingualNeural',rate=rate,pitch=pitch).save(str(raw))
   final=OUT/(name+'.wav')
   subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(raw),'-af','silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.025,areverse,silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.08,areverse,loudnorm=I=-17:TP=-2:LRA=8','-ar','48000','-ac','1',str(final)],check=True)
   duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(final)]))
   raw.unlink()
   print(name,round(duration,2),'seconds',flush=True)
   return {'file':name+'.wav','text':text,'from':start,'duration':duration,'voice':'en-US-AvaMultilingualNeural','rate':rate,'pitch':pitch}
 manifest=await asyncio.gather(*(create(p) for p in PHRASES))
 (OUT/'voice-manifest.json').write_text(json.dumps(manifest,indent=2))
asyncio.run(main())
