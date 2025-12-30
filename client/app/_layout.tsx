// import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { lockAsync, OrientationLock } from 'expo-screen-orientation';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    // const [loaded] = useFonts({
    //     SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    // });

    useEffect(() => {
        // if (loaded) {
        SplashScreen.hide();
        lockAsync(OrientationLock.LANDSCAPE);
        // }
    }, []);

    // if (!loaded) {
    //     return null;
    // }

    return <Stack screenOptions={{ headerShown: false }} />;
}
