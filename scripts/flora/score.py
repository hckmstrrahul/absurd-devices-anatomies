"""Deterministic 48 kHz Am9 / 92 bpm score; events read the same tour as the page."""
import array,json,math,pathlib,random,re,subprocess,wave
ROOT=pathlib.Path(__file__).resolve().parents[2]
tl=json.loads((ROOT/'web/src/flora/timeline.json').read_text())
scan=float(re.search(r'SCAN_SECONDS\s*=\s*([\d.]+)',(ROOT/'model.mjs').read_text()).group(1))
SR=48000;duration=tl['duration'];n=int(SR*duration);out=ROOT/'shots/flora';out.mkdir(parents=True,exist_ok=True)
audio=array.array('f',[0])*n
random.seed(42)
def mix(at,length,fn,gain):
 start=int(at*SR);count=min(int(length*SR),n-start)
 for i in range(max(0,count)):audio[start+i]+=gain*fn(i/SR,i)
# A soft electric-piano chord bed; all pitches belong to A minor ninth.
notes=[110,164.8138,195.9977,246.9417,293.6648]
bar=4*60/92
for b in range(math.ceil(duration/bar)):
 for j,hz in enumerate(notes):
  mix(b*bar+j*.012,4.5,lambda t,i,f=hz: (math.sin(2*math.pi*f*t)+.16*math.sin(2*math.pi*f*2*t))*min(1,t/.018)*math.exp(-t/1.6),.055)
# One low pulse on each five-second scan reset.
for cycle in range(math.ceil(duration/scan)):
 mix(cycle*scan,.35,lambda t,i:math.sin(2*math.pi*72*t)*math.exp(-t/.075)*min(1,t/.006),.12)
# Every operator click and intensity sweep comes from the shared beat times.
for index,beat in enumerate(tl['beats']):
 mix(beat['at'],.035,lambda t,i:math.sin(2*math.pi*2100*t)*math.exp(-t/.008)*min(1,t/.001),.035)
 prior=tl['beats'][index-1]
 if beat['intensity']!=prior['intensity']:
  mix(beat['at'],1.15,lambda t,i:(random.random()*2-1)*math.sin(math.pi*t/1.15)*.6,.018)
raw=out/'score-raw.wav'
with wave.open(str(raw),'wb') as f:
 f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);buf=array.array('h')
 for i,x in enumerate(audio):
  fade=min(1,i/SR/.7,(duration-i/SR)/1.8);v=int(max(-.98,min(.98,x*fade))*32767);buf.extend([v,v])
 f.writeframes(buf.tobytes())
measure=subprocess.run(['ffmpeg','-hide_banner','-i',str(raw),'-af','loudnorm=I=-14:TP=-2:LRA=11:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
stats=json.loads(measure.stderr[measure.stderr.rfind('{'):measure.stderr.rfind('}')+1]);(out/'loudness-pass1.json').write_text(json.dumps(stats,indent=2))
flt=f"loudnorm=I=-14:TP=-2:LRA=11:measured_I={stats['input_i']}:measured_TP={stats['input_tp']}:measured_LRA={stats['input_lra']}:measured_thresh={stats['input_thresh']}:offset={stats['target_offset']}:linear=true:print_format=json"
r=subprocess.run(['ffmpeg','-y','-hide_banner','-i',str(raw),'-af',flt,'-ar','48000',str(out/'score.wav')],capture_output=True,text=True,check=True)
print(r.stderr[r.stderr.rfind('{'):])
