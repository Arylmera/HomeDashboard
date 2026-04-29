import { createRoot } from 'react-dom/client';
import '../../styles/forge.css';
import '../../styles/space-bg.css';
import '../../styles/nas.css';
import '../../styles/plex.css';
import '../../lib/arylmera-menu.js';
import Plex from './Plex.jsx';

createRoot(document.getElementById('root')).render(<Plex />);
