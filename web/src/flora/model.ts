import {telemetry,SCAN_SECONDS} from '../../../model.mjs';
import geometry from '../generated/flora-geometry.json';
import timeline from './timeline.json';
export type Part = 'receiver'|'display'|'processor'|'audio'|'power'|'chassis';
export type View = 'hero'|'front'|'side'|'top'|'inside';
export type Mode = 'solid'|'xray'|'section';
export type Controls = {selected:Part|null;separation:number;intensity:number;view:View;mode:Mode;isolated:boolean};
export const defaults:Controls={selected:null,separation:0,intensity:58,view:'hero',mode:'solid',isolated:false};
export const parts=geometry.assemblies;
export const clamp=(x:number,min=0,max=1)=>Math.min(max,Math.max(min,x));
export const smooth=(x:number)=>{const t=clamp(x);return t*t*(3-2*t)};
export function sampleAt(time:number,intensity:number){
 const phase=((Math.max(0,time)%SCAN_SECONDS)/SCAN_SECONDS);
 const field=clamp(intensity,0,100)*(0.96+0.04*Math.sin(phase*Math.PI*2));
 const data=telemetry(field,phase,true);
 return {...data,phase,time,field,intensity,scanY:16+phase*78,stress:clamp((intensity-85)/15),status:intensity>85?'FIELD SATURATION':intensity<15?'LOW SIGNAL':'SPECIMEN LINKED',cycle:Math.floor(time/SCAN_SECONDS)+1};
}
export type Sample=ReturnType<typeof sampleAt>;
export function tourAt(time:number){
 const t=((time%timeline.duration)+timeline.duration)%timeline.duration;
 const index=Math.max(0,timeline.beats.reduce((found,b,i)=>b.at<=t?i:found,0));
 const beat=timeline.beats[index];const previous=timeline.beats[(index-1+timeline.beats.length)%timeline.beats.length];
 const blend=smooth((t-beat.at)/1.15);
 return {controls:{selected:beat.part as Part|null,separation:previous.separation+(beat.separation-previous.separation)*blend,intensity:previous.intensity+(beat.intensity-previous.intensity)*blend,view:beat.camera as View,mode:beat.mode as Mode,isolated:false},index,beat,blend,t};
}
export const cameras:Record<View,{position:number[];target:number[]}>= {
 hero:{position:[-240,205,300],target:[-12,67,10]},
 front:{position:[0,110,390],target:[0,70,20]},
 side:{position:[-390,115,0],target:[-10,65,0]},
 top:{position:[0,440,0.1],target:[0,55,0]},
 inside:{position:[-155,215,205],target:[0,80,0]},
};
export {geometry,timeline,SCAN_SECONDS};
