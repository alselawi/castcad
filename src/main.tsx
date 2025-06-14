import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { FluentProvider, teamsLightTheme } from '@fluentui/react-components';
import { initializeIcons } from '@fluentui/react/lib/Icons';

initializeIcons();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FluentProvider theme={teamsLightTheme}>
        <App></App>
    </FluentProvider>
  </StrictMode>,
)
