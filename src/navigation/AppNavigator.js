import React, {useContext} from 'react';
import {Text} from 'react-native';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {AuthContext} from '../context/AuthContext';
import {colors} from '../theme/colors';

import LoginScreen        from '../screens/LoginScreen';
import DashboardScreen    from '../screens/DashboardScreen';
import AccessMatrixScreen from '../screens/AccessMatrixScreen';
import TeamDirectoryScreen from '../screens/TeamDirectoryScreen';
import GlobalUnlockScreen from '../screens/GlobalUnlockScreen';
import SecurityScreen     from '../screens/SecurityScreen';
import SettingsScreen     from '../screens/SettingsScreen';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

const TABS = [
  {name: 'Dashboard',    component: DashboardScreen,    label: 'Home',     icon: '🏠'},
  {name: 'AccessMatrix', component: AccessMatrixScreen, label: 'Matrix',   icon: '⊞'},
  {name: 'Team',         component: TeamDirectoryScreen, label: 'Team',    icon: '👥'},
  {name: 'GlobalUnlock', component: GlobalUnlockScreen, label: 'Unlock',   icon: '🔓'},
  {name: 'Security',     component: SecurityScreen,     label: 'Security', icon: '🛡'},
];

function TabIcon({icon, focused}) {
  return <Text style={{fontSize: 18, opacity: focused ? 1 : 0.55}}>{icon}</Text>;
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.s1,
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
          height: 58,
          paddingBottom: 6,
          paddingTop: 4,
        },
        tabBarActiveTintColor:   colors.jd,
        tabBarInactiveTintColor: colors.text2,
        tabBarLabelStyle: {fontSize: 9, fontWeight: '600'},
      }}>
      {TABS.map(t => (
        <Tab.Screen
          key={t.name}
          name={t.name}
          component={t.component}
          options={{
            tabBarLabel: t.label,
            tabBarIcon: ({focused}) => <TabIcon icon={t.icon} focused={focused} />,
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const {isAuthenticated} = useContext(AuthContext);

  return (
    <Stack.Navigator screenOptions={{headerShown: false, cardStyle: {backgroundColor: colors.bg}}}>
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Main"     component={MainTabs} />
          <Stack.Screen name="Settings" component={SettingsScreen}
            options={{presentation: 'modal', gestureEnabled: true}} />
        </>
      )}
    </Stack.Navigator>
  );
}
