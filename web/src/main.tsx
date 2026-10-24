import {createRoot} from 'react-dom/client';
import '@fontsource-variable/inter';
import './styles/globals.css';
import './generated/artwork.css';
import './styles/app.css';
import {App} from './App';
createRoot(document.getElementById('root')!).render(<App/>);
