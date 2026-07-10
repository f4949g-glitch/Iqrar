import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
// خطوط مستضافة محليًا ضمن الحزمة بدل طلب خارجي حاجب للعرض من fonts.googleapis.com
// (كان يمنع أي رسم للصفحة إلى أن يكتمل، ويُبطئ الفتح أو يُجمّده عند أي بطء في الشبكة).
import '@fontsource/cairo/600.css';
import '@fontsource/cairo/700.css';
import '@fontsource/cairo/800.css';
import '@fontsource/tajawal/400.css';
import '@fontsource/tajawal/500.css';
import '@fontsource/tajawal/700.css';
import './index.css';
import { App } from './app/App';
import { initTheme } from './shared/lib/theme';

initTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
