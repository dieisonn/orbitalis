'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'

type Theme = 'auto' | 'light' | 'dark'

const ORDER: Theme[] = ['auto', 'light', 'dark']

const CONFIG: Record<Theme, { icon: typeof Sun; label: string }> = {
  auto:  { icon: Monitor, label: 'Auto' },
  light: { icon: Sun,     label: 'Claro' },
  dark:  { icon: Moon,    label: 'Escuro' },
}

function readTheme(): Theme {
  try {
    return (localStorage.getItem('orbitalis-theme') as Theme | null) ?? 'auto'
  } catch {
    return 'auto'
  }
}

function applyTheme(theme: Theme) {
  const html = document.documentElement
  if (theme === 'dark') {
    html.classList.add('is-dark')
  } else if (theme === 'light') {
    html.classList.remove('is-dark')
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    html.classList.toggle('is-dark', prefersDark)
  }
  try {
    if (theme === 'auto') localStorage.removeItem('orbitalis-theme')
    else localStorage.setItem('orbitalis-theme', theme)
  } catch { /* noop */ }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('auto')

  useEffect(() => {
    setTheme(readTheme())
  }, [])

  function cycle() {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]
    setTheme(next)
    applyTheme(next)
  }

  const { icon: Icon, label } = CONFIG[theme]

  return (
    <button
      type="button"
      onClick={cycle}
      title={`Tema atual: ${label} — clique para alternar`}
      className="flex items-center gap-2.5 w-full px-2.5 py-1.5 text-[13px] text-white/55 hover:text-white/90 transition-colors rounded-lg hover:bg-white/8"
    >
      <Icon size={14} />
      {label}
    </button>
  )
}
