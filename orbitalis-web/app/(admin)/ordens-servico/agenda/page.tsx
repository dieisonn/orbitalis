import { redirect } from 'next/navigation'

// A agenda mudou para /agenda (agenda própria do Orbitalis)
export default function AgendaAntiga() {
  redirect('/agenda')
}
