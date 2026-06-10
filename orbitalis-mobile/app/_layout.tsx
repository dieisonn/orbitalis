import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { initDatabase } from '../src/db/database'
import { isAuthenticated } from '../src/store/auth'
import { router } from 'expo-router'

export default function RootLayout() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function init() {
      initDatabase()
      const auth = await isAuthenticated()
      if (!auth) {
        router.replace('/(auth)/login')
      } else {
        router.replace('/(tecnico)/agenda')
      }
      setReady(true)
    }
    init()
  }, [])

  if (!ready) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  )
}
