import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CampaignsScreen from './src/screens/CampaignsScreen';
import CampaignDetailsScreen from './src/screens/CampaignDetailsScreen';
import CreateCampaignScreen from './src/screens/CreateCampaignScreen';
import {RootStackParamList} from './src/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
        }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Campaigns" component={CampaignsScreen} />
        <Stack.Screen name="CampaignDetails" component={CampaignDetailsScreen} />
        <Stack.Screen name="CreateCampaign" component={CreateCampaignScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
