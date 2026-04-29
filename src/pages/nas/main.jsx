import { createRoot } from 'react-dom/client';
import '../../styles/forge.css';
import '../../styles/space-bg.css';
import '../../styles/nas.css';
import '../../lib/arylmera-menu.js';
import NAS from './NAS.jsx';

createRoot(document.getElementById('root')).render(<NAS />);
