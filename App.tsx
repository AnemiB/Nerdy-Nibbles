import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens (make sure these files exist under /screens)
import SplashScreen from './screens/SplashScreen';
import LogInScreen from './screens/LogInScreen';
import SignUpScreen from './screens/SignUpScreen';
import HomeScreen from './screens/HomeScreen';
import LessonsScreen from './screens/LessonsScreen';
import LessonDetailScreen from './screens/LessonDetailScreen';
import QuizScreen from './screens/QuizScreen';
import NibbleAiScreen from './screens/NibbleAiScreen';
import SettingsScreen from './screens/SettingsScreen';

import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="LogIn" component={LogInScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Lessons" component={LessonsScreen} />
        <Stack.Screen name="LessonDetail" component={LessonDetailScreen} />
        <Stack.Screen name="Quiz" component={QuizScreen} />
        <Stack.Screen name="NibbleAi" component={NibbleAiScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
