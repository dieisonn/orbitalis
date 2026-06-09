'use server'
import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

export async function deletarUsuario(id: string) {
  await api.delete(`/usuarios/${id}`)
  redirect('/usuarios')
}
