import { createRoot } from 'react-dom/client';
import '../../styles/forge.css';
import '../../styles/space-bg.css';
import '../../styles/quicklinks.css';
import '../../lib/arylmera-menu.js';
import Quicklinks from './Quicklinks.jsx';

createRoot(document.getElementById('root')).render(<Quicklinks />);
