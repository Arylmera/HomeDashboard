import { createRoot } from 'react-dom/client';
import '../../styles/forge.css';
import '../../styles/space-bg.css';
import '../../styles/apps.css';
import '../../lib/arylmera-menu.js';
import Apps from './Apps.jsx';

createRoot(document.getElementById('root')).render(<Apps />);
