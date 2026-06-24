import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import Home from '../screens/Home';
import JobDetails from '../screens/JobDetails';
import SavedJobs from '../screens/SavedJobs';
import Profile from '../screens/Profile';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const HomeStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: '#0f172a' },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: '700' },
      headerShown: true,
    }}
  >
    <Stack.Screen
      name="HomeScreen"
      component={Home}
      options={{ title: 'Find Jobs' }}
    />
    <Stack.Screen
      name="JobDetailsScreen"
      component={JobDetails}
      options={{ title: 'Job Details' }}
    />
  </Stack.Navigator>
);

export default function RootNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color }) => {
          let iconName;
          if (route.name === 'SearchJobs') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Saved') {
            iconName = focused ? 'bookmark' : 'bookmark-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={24} color={color} />;
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#1e293b',
          borderTopColor: '#334155',
          paddingBottom: 5,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="SearchJobs"
        component={HomeStack}
        options={{ title: 'Search' }}
      />
      <Tab.Screen
        name="Saved"
        component={SavedJobs}
        options={{ title: 'Saved' }}
      />
      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}
