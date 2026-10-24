export type Mode = 'wireframe' | 'rendered';
export interface InstrumentState {
  target: number;
  mode: Mode;
  selected: string | null;
}
export const initialState: InstrumentState = {target:0,mode:'wireframe',selected:null};
export type Action = {type:'separate';value:number}|{type:'mode';value:Mode}|{type:'select';id:string}|{type:'reset'}|{type:'assemble'};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function instrumentReducer(state:InstrumentState,action:Action):InstrumentState {
  switch(action.type){
    case 'separate':return {...state,target:clamp(action.value)};
    case 'mode':return {...state,mode:action.value};
    case 'select':return {...state,selected:state.selected===action.id?null:action.id,target:state.selected===action.id?state.target:1};
    case 'assemble':return {...state,target:0,selected:null};
    case 'reset':return {...initialState,mode:state.mode};
  }
}
