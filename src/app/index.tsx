import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigation } from './navigation/AppNavigation';
import { AppThemeProvider } from './providers/AppThemeProvider';
import { DatabaseProvider } from './providers/DatabaseProvider';

const App = () => (
  <SafeAreaProvider>
    <DatabaseProvider>
      <AppThemeProvider>
        <AppNavigation />
      </AppThemeProvider>
    </DatabaseProvider>
  </SafeAreaProvider>
);

export default App;
