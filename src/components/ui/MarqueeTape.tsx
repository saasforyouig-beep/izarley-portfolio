const TEXTS = {
  a: 'Analista de IA',
  b: 'Desenvolvedor de Sistemas',
} as const

/** Duas faixas cruzadas estilo fita de interdição, cada uma com um
    ofício correndo em marquee infinito — cada faixa num sentido. */
export default function MarqueeTape({ className = '' }: { className?: string }) {
  const items = Array.from({ length: 16 })

  return (
    <div className={`tape-wrap ${className}`.trim()} aria-hidden="true">
      {(['a', 'b'] as const).map((v) => (
        <div key={v} className={`tape tape--${v}`}>
          <div className="tape__track">
            {items.map((_, i) => (
              <span key={i} className="tape__item">
                {TEXTS[v]} <i>✦</i>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
