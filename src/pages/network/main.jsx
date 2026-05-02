import { createRoot } from 'react-dom/client';
import '../../styles/forge.css';
import '../../styles/space-bg.css';
import '../../styles/quicklinks.css';
import '../../styles/network.css';
import '../../lib/arylmera-menu.js';
import Network from './Network.jsx';

createRoot(document.getElementById('root')).render(<Network />);
