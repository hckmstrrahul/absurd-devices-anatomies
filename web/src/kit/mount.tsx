import {createRoot} from 'react-dom/client';
import '@fontsource-variable/inter';
import '../styles/globals.css';
import '../styles/app.css';
import './kit.css';
import {DevicePage} from './DevicePage';
import type {DeviceDef} from './types';

export function mount<S,P>(def:DeviceDef<S,P>){createRoot(document.getElementById('root')!).render(<DevicePage def={def}/>)}
