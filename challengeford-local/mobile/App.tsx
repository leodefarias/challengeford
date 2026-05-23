import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import {
  useFonts,
  DMMono_500Medium,
} from '@expo-google-fonts/dm-mono';
import {
  DMSans_400Regular,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  Syne_500Medium,
  Syne_700Bold,
} from '@expo-google-fonts/syne';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

function Root() {
  const { mode, colors } = useTheme();

  const [fontsLoaded] = useFonts({
    DMMono_500Medium,
    DMSans_400Regular,
    DMSans_600SemiBold,
    DMSans_700Bold,
    Syne_500Medium,
    Syne_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accentBlue} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Root />
    </ThemeProvider>
  );
}
