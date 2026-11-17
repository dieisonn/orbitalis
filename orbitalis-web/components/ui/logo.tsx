/* Logotipo Orbitalis. "auto" troca sozinho para a versão clara no tema escuro;
   "branco" é para fundos azuis/escuros; "simbolo" mostra só o planeta.
   Largura/altura fixas evitam o salto de layout; a versão do tema escuro só é baixada quando aparece. */
type Props = { variante?: 'auto' | 'branco' | 'simbolo'; className?: string; alt?: string }

const MEDIDAS = {
  logo: { width: 206, height: 32 },    // proporção 6,44 : 1
  simbolo: { width: 39, height: 32 },  // proporção 1,23 : 1
}

export function Logo({ variante = 'auto', className = 'h-8 w-auto', alt = 'Orbitalis' }: Props) {
  const m = variante === 'simbolo' ? MEDIDAS.simbolo : MEDIDAS.logo
  const claro = variante === 'simbolo' ? '/brand/simbolo.svg' : '/brand/logo.svg'
  const escuro = variante === 'simbolo' ? '/brand/simbolo-branco.svg' : '/brand/logo-branco.svg'
  if (variante === 'branco') return <img src={escuro} alt={alt} {...m} className={className} />
  return (
    <>
      <img src={claro} alt={alt} {...m} className={`logo-claro ${className}`} />
      <img src={escuro} alt={alt} {...m} loading="lazy" className={`logo-escuro ${className}`} />
    </>
  )
}
