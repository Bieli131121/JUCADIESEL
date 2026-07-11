import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Tema = 'claro' | 'escuro'

interface ThemeContextType {
  tema: Tema
  alternarTema: () => void
  definirTema: (t: Tema) => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

function aplicarClasseHtml(tema: Tema) {
  document.documentElement.classList.toggle('dark', tema === 'escuro')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(() => {
    const salvo = localStorage.getItem('oficina_tema') as Tema | null
    return salvo || 'claro'
  })

  useEffect(() => {
    aplicarClasseHtml(tema)
    localStorage.setItem('oficina_tema', tema)
  }, [tema])

  function alternarTema() {
    setTema((t) => (t === 'claro' ? 'escuro' : 'claro'))
  }

  function definirTema(t: Tema) {
    setTema(t)
  }

  return <ThemeContext.Provider value={{ tema, alternarTema, definirTema }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme deve ser usado dentro de ThemeProvider')
  return ctx
}
