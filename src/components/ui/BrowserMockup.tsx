import { forwardRef } from 'react'

export type MockupVariant = 'dashboard' | 'crm' | 'analytics'

const BARS: Record<MockupVariant, number[]> = {
  dashboard: [35, 55, 40, 70, 52, 85, 64, 92, 75, 60, 88, 100],
  crm: [20, 45, 60, 38, 72, 55, 90, 66],
  analytics: [50, 30, 65, 45, 80, 58, 95, 70, 42, 88, 62, 100, 76, 54],
}

const BrowserMockup = forwardRef<
  HTMLDivElement,
  {
    variant: MockupVariant
    url: string
    image?: string
    imageAlt?: string
    device?: 'desktop' | 'mobile'
  }
>(function BrowserMockup({ variant, url, image, imageAlt, device = 'desktop' }, ref) {
  // apps mobile: moldura de celular em vez de navegador
  if (device === 'mobile') {
    return (
      <div ref={ref} className="mobile-mock">
        <div className="mobile-mock__screen" data-tour-screen>
          {image && (
            <img src={image} alt={imageAlt ?? 'Tela do aplicativo'} loading="lazy" />
          )}
        </div>
      </div>
    )
  }

  return (
    <div ref={ref} className="browser">
      <div className="browser__bar">
        <span className="browser__dot" />
        <span className="browser__dot" />
        <span className="browser__dot" />
        <div className="browser__url">{url}</div>
      </div>

      {image ? (
        <img
          className="browser__shot"
          src={image}
          alt={imageAlt ?? 'Tela do sistema'}
          loading="lazy"
        />
      ) : (
        <div className="browser__body">
          {variant === 'dashboard' && (
            <div className="sk-row">
              <div className="sk-block sk-sidebar" data-tour="nav">
                <div className="sk-line" style={{ width: '70%' }} />
                <div className="sk-line" style={{ width: '90%' }} />
                <div className="sk-line" style={{ width: '60%' }} />
                <div className="sk-line" style={{ width: '80%' }} />
                <div className="sk-line" style={{ width: '55%' }} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="sk-row" data-tour="kpis">
                  <div className="sk-block sk-kpi">
                    <span className="small">Receita</span>
                    <span className="big">R$ 128k</span>
                  </div>
                  <div className="sk-block sk-kpi">
                    <span className="small">Pedidos</span>
                    <span className="big">1.204</span>
                  </div>
                  <div className="sk-block sk-kpi">
                    <span className="small">Conversão</span>
                    <span className="big">4.8%</span>
                  </div>
                </div>
                <div className="sk-block sk-chart" data-tour="chart">
                  {BARS.dashboard.map((h, i) => (
                    <i key={i} style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {variant === 'crm' && (
            <>
              <div className="sk-row" data-tour="kpis">
                <div className="sk-block sk-kpi">
                  <span className="small">Leads ativos</span>
                  <span className="big">312</span>
                </div>
                <div className="sk-block sk-kpi">
                  <span className="small">Em negociação</span>
                  <span className="big">87</span>
                </div>
                <div className="sk-block sk-kpi">
                  <span className="small">Fechados/mês</span>
                  <span className="big">41</span>
                </div>
              </div>
              <div className="sk-row">
                <div className="sk-block sk-table" data-tour="table">
                  <div className="sk-line" style={{ width: '95%' }} />
                  <div className="sk-line" style={{ width: '88%' }} />
                  <div className="sk-line" style={{ width: '92%' }} />
                  <div className="sk-line" style={{ width: '80%' }} />
                  <div className="sk-line" style={{ width: '90%' }} />
                </div>
                <div className="sk-block sk-chart" data-tour="chart" style={{ flex: 1 }}>
                  {BARS.crm.map((h, i) => (
                    <i key={i} style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </>
          )}

          {variant === 'analytics' && (
            <>
              <div className="sk-block sk-chart" data-tour="chart" style={{ height: 170 }}>
                {BARS.analytics.map((h, i) => (
                  <i key={i} style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className="sk-row" data-tour="kpis">
                <div className="sk-block sk-kpi">
                  <span className="small">Mensagens/dia</span>
                  <span className="big">8.4k</span>
                </div>
                <div className="sk-block sk-kpi">
                  <span className="small">Resolvidas por IA</span>
                  <span className="big">92%</span>
                </div>
                <div className="sk-block sk-kpi">
                  <span className="small">Tempo médio</span>
                  <span className="big">14s</span>
                </div>
              </div>
              <div className="sk-block sk-table" data-tour="table">
                <div className="sk-line" style={{ width: '90%' }} />
                <div className="sk-line" style={{ width: '85%' }} />
                <div className="sk-line" style={{ width: '93%' }} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
})

export default BrowserMockup
