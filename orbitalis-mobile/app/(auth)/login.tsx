import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { router } from 'expo-router'
import { login } from '../../src/api/client'
import { colors } from '../../src/theme'

export default function LoginScreen() {
  const [email, setEmail]       = useState('')
  const [senha, setSenha]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleLogin() {
    if (!email || !senha) return
    setLoading(true)
    try {
      const data = await login(email.trim(), senha)
      if (data.role !== 'tecnico') {
        Alert.alert('Acesso negado', 'Este app é exclusivo para técnicos.')
        return
      }
      router.replace('/(tecnico)/agenda')
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Falha no login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Logo */}
      <View style={s.logoArea}>
        <View style={s.logoCircle}>
          <Text style={s.logoLetter}>O</Text>
        </View>
        <Text style={s.logoText}>Orbitalis</Text>
        <Text style={s.tagline}>DADOS EM ÓRBITA. MANUTENÇÃO EM DIA.</Text>
      </View>

      {/* Card */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Acesso do Técnico</Text>

        <Text style={s.label}>E-mail</Text>
        <TextInput
          style={s.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="seu@email.com"
          placeholderTextColor="#aaa"
        />

        <Text style={s.label}>Senha</Text>
        <TextInput
          style={s.input}
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor="#aaa"
        />

        <TouchableOpacity
          style={[s.btn, loading && s.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>Entrar</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.primary, justifyContent: 'center', padding: 24 },
  logoArea:   { alignItems: 'center', marginBottom: 32 },
  logoCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoLetter: { fontSize: 28, fontWeight: '700', color: colors.primary },
  logoText:   { fontSize: 28, fontWeight: '700', color: '#fff' },
  tagline:    { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 4, letterSpacing: 1 },
  card:       { backgroundColor: '#fff', borderRadius: 16, padding: 24 },
  cardTitle:  { fontSize: 16, fontWeight: '600', color: colors.primary, marginBottom: 20 },
  label:      { fontSize: 13, fontWeight: '500', color: '#555', marginBottom: 6 },
  input:      { borderWidth: 1, borderColor: '#e0d8e8', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#222', marginBottom: 16 },
  btn:        { backgroundColor: colors.action, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnDisabled:{ opacity: 0.6 },
  btnText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
})
