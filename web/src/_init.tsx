import ReactDOM from 'react-dom/client';
import { AppWrapRouter } from './App';

ReactDOM
    .createRoot( document.getElementById('app') as Element )
    .render(<AppWrapRouter />);
