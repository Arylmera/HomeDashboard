import { createRoot } from 'react-dom/client';
import '../../styles/forge.css';
import '../../styles/space-bg.css';
import '../../styles/apps.css';
import '../../styles/docker.css';
import '../../lib/arylmera-menu.js';
import Docker from './Docker.jsx';

createRoot(document.getElementById('root')).render(<Docker />);
