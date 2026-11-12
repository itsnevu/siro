"""A single contextual read preserves question/answer intonation and connected phrasing."""
import asyncio,json,pathlib,subprocess
import edge_tts
ROOT=pathlib.Path(__file__).parent/'public'/'audio'
TEXT="What if your strategy could move on its own? With Siro, it can. One idea becomes your agent. Built around your rules. So every move stays within your limits. You're in control. Siro. Your strategy, in motion."
async def main():
 ROOT.mkdir(exist_ok=True,parents=True)
 events=[]
 voice=edge_tts.Communicate(TEXT,'en-US-JennyNeural',rate='-8%',pitch='+1Hz',boundary='WordBoundary')
 with (ROOT/'performance-raw.mp3').open('wb') as audio:
  async for chunk in voice.stream():
   if chunk['type']=='audio':audio.write(chunk['data'])
   elif chunk['type']=='WordBoundary':events.append({'word':chunk['text'],'time':chunk['offset']/10000000})
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(ROOT/'performance-raw.mp3'),'-af','loudnorm=I=-17:TP=-2:LRA=10','-ar','48000','-ac','1',str(ROOT/'siro-performance.wav')],check=True)
 duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(ROOT/'siro-performance.wav')]))
 (ROOT/'performance.json').write_text(json.dumps({'voice':'en-US-JennyNeural','text':TEXT,'duration':duration,'words':events},indent=2))
 print(json.dumps({'duration':duration,'words':events}))
asyncio.run(main())
