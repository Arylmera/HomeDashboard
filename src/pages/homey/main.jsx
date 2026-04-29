import { createRoot } from 'react-dom/client';
import '../../styles/forge.css';
import '../../styles/space-bg.css';
import '../../styles/nas.css';
import '../../styles/homey.css';
import '../../lib/arylmera-menu.js';
import Homey from './Homey.jsx';

createRoot(document.getElementById('root')).render(<Homey />);
