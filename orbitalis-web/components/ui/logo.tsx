/* Logotipo Orbitalis. "auto" troca sozinho para a versão clara no tema escuro;
   "branco" é para fundos azuis/escuros; "simbolo" mostra só o planeta. */
type Props = { variante?: 'auto' | 'branco' | 'simbolo'; className?: string; alt?: string }

export function Logo({ variante = 'auto', className = 'h-8 w-auto', alt = 'Orbitalis' }: Props) {
  if (variante === 'branco') return <img src="/brand/logo-branco.svg" alt={alt} className={className} />
  if (variante === 'simbolo') {
    return (
      <>
        <img src="/brand/simbolo.svg" alt={alt} className={`logo-claro ${className}`} />
        <img src="/brand/simbolo-branco.svg" alt={alt} className={`logo-escuro ${className}`} />
      </>
    )
  }
  return (
    <>
      <img src="/brand/logo.svg" alt={alt} className={`logo-claro ${className}`} />
      <img src="/brand/logo-branco.svg" alt={alt} className={`logo-escuro ${className}`} />
    </>
  )
}
