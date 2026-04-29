import { createRoot } from 'react-dom/client';
import Home from './Home.jsx';
import '../../styles/forge.css';
import '../../styles/space-bg.css';
import '../../styles/home.css';
import '../../lib/arylmera-menu.js';

createRoot(document.getElementById('root')).render(<Home />);
