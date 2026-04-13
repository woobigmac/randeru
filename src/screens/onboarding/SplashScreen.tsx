import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useUserStore } from '../../store/useUserStore';

export default function SplashScreen() {
  const loadUser = useUserStore((state) => state.loadUser);

  useEffect(() => {
    loadUser();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 32, fontWeight: 'bold' }}>랜데루</Text>
    </View>
  );
}
