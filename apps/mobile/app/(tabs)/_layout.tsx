import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '@/lib/theme';

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: focused ? '700' : '500',
        color: focused ? colors.ink : colors.inkMuted,
      }}
    >
      {label}
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: {
          backgroundColor: colors.cream,
          borderTopColor: colors.creamDeep,
        },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'Сегодня',
          tabBarLabel: ({ focused }) => (
            <TabLabel label="Сегодня" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Неделя',
          tabBarLabel: ({ focused }) => (
            <TabLabel label="Неделя" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="grades"
        options={{
          title: 'Оценки',
          tabBarLabel: ({ focused }) => (
            <TabLabel label="Оценки" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Заявки',
          tabBarLabel: ({ focused }) => (
            <TabLabel label="Заявки" focused={focused} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Лента',
          tabBarLabel: ({ focused }) => (
            <TabLabel label="Лента" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
