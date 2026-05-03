import { createRoot } from 'react-dom/client';
import '../../styles/forge.css';
import '../../styles/space-bg.css';
import '../../styles/music.css';
import '../../lib/arylmera-menu.js';
import Music from './Music.jsx';

createRoot(document.getElementById('root')).render(<Music />);
