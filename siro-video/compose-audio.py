"""Original restrained instrumental and tactile SFX. No stock audio or music models."""
import numpy as np, pathlib, wave, subprocess
ROOT=pathlib.Path(__file__).parent/'public'/'audio'
SR=48000
N=20*SR
rng=np.random.default_rng(2718)
music=np.zeros((N,2)); sfx=np.zeros((N,2))
def add(track,signal,start,amp=1,pan=0):
 i=round(start*SR); n=min(len(signal),N-i)
 if i<0 or n<=0:return
 track[i:i+n,0]+=signal[:n]*amp*np.sqrt((1-pan)/2)
 track[i:i+n,1]+=signal[:n]*amp*np.sqrt((1+pan)/2)
def freq(midi):return 440*2**((midi-69)/12)
def tone(midi,dur,decay=1.3):
 t=np.arange(round(dur*SR))/SR; hz=freq(midi)
 env=(1-np.exp(-t/.008))*np.exp(-t/decay)
 return (np.sin(2*np.pi*hz*t)+.16*np.sin(2*np.pi*hz*2*t)+.035*np.sin(2*np.pi*hz*3*t))*env
def air(dur,cutoff=1700):
 size=round(dur*SR); noise=rng.normal(0,1,size)
 ft=np.fft.rfft(noise); hz=np.fft.rfftfreq(size,1/SR)
 ft*=np.exp(-(hz/cutoff)**2)*(1-np.exp(-(hz/250)**2))
 v=np.fft.irfft(ft,n=size)
 return v/(np.max(np.abs(v))+1e-8)
def pad(chord,start,length=6):
 t=np.arange(round(length*SR))/SR
 env=np.minimum(t/1.2,1)*np.minimum((length-t)/1.4,1)
 for j,note in enumerate(chord):
  hz=freq(note)
  x=(np.sin(2*np.pi*hz*t)+.22*np.sin(2*np.pi*hz*1.0015*t)+.09*np.sin(2*np.pi*hz*2*t))
  add(music,x*env,start,.035,(j-1.5)/3)
for chord,start in [([50,57,60,64],0),([53,57,60,64],5),([45,55,60,64],10),([48,55,59,62],15)]:pad(chord,start)
# A four-note felt-key motif, sparse enough to leave space for the narration.
notes=[74,69,76,72,77,72,76,69]
for i,start in enumerate(np.arange(1,17,.75)):
 x=tone(notes[i%len(notes)],2.4,.48)
 add(music,x,float(start),.055,(-.3 if i%2 else .3))
 add(music,x,float(start+.375),.011,(.4 if i%2 else -.4))
for start in np.arange(1.5,18,.5):
 t=np.arange(int(.3*SR))/SR
 x=np.sin(2*np.pi*(48*t+20*.025*(1-np.exp(-t/.025))))*np.exp(-t/.07)*(1-np.exp(-t/.004))
 add(music,x,float(start),.065)
# Soft physical clicks: short filtered noise with a damped wooden resonance.
for j,start in enumerate([3.52,3.72,8.75,9.05,9.35,10.65,11.05,12.42,14.55]):
 t=np.arange(int(.075*SR))/SR
 x=air(.075,2300)*np.exp(-t/.009)+.28*np.sin(2*np.pi*640*t)*np.exp(-t/.018)
 add(sfx,x,start,.11 if start<6 else .22,(-.15 if j%2 else .15))
# Restrained air movements mark the four scene handoffs; no long riser or crash.
for start,dur,pan in [(1.37,.3,-.2),(3.28,.3,.2),(8.28,.3,-.2),(12.02,.3,.15),(14.28,.3,-.15),(16.84,.22,.2)]:
 env=np.sin(np.linspace(0,np.pi,round(dur*SR)))**2
 add(sfx,air(dur,1300)*env,start,.15,pan)
for start in [1.6,6.5,10.5,18.0]:
 t=np.arange(int(.55*SR))/SR
 x=(np.sin(2*np.pi*92*t)+.25*np.sin(2*np.pi*184*t))*np.exp(-t/.13)*(1-np.exp(-t/.007))
 add(sfx,x,start,.19)
add(sfx,tone(69,.6,.12),3.62,.08,-.1)
add(sfx,tone(76,.6,.16),3.71,.05,.1)
add(music,tone(74,2.0,1.0),18.0,.06)
fade=np.minimum(np.arange(N)/SR/.6,1)*np.minimum((N-np.arange(N))/SR/1.2,1)
def save(name,data,lufs):
 data=data*fade[:,None]
 raw=ROOT/(name+'-raw.wav'); final=ROOT/(name+'.wav')
 with wave.open(str(raw),'wb') as w:
  w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR)
  w.writeframes((np.clip(data,-1,1)*32767).astype('<i2').tobytes())
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(raw),'-af',f'loudnorm=I={lufs}:TP=-3:LRA=9','-ar',str(SR),str(final)],check=True)
 raw.unlink()
ROOT.mkdir(parents=True,exist_ok=True)
save('siro-score',music,-24)
save('siro-foley',sfx,-25)
print('Original 20s score and tactile SFX written.')
