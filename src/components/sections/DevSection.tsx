import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import BrowserMockup, { type MockupVariant } from '../ui/BrowserMockup'
import ProjectTour, { type TourStep } from '../ui/ProjectTour'
import { lenisStore } from '../../lib/lenisStore'

type Project = {
  name: string
  url: string
  variant: MockupVariant
  /** print real do sistema (public/projects/*.png|jpg) — substitui o esqueleto */
  image?: string
  /** apps mobile ganham moldura de celular em vez de navegador */
  device?: 'desktop' | 'mobile'
  /** selo de destaque (ex.: papel no projeto) */
  badge?: string
  desc: string
  stack: string[]
  steps: TourStep[]
}

const PROJECTS: Project[] = [
  {
    name: 'Dumply — Marketplace Contra o Desperdício',
    url: 'app dumply · iOS & Android',
    variant: 'analytics',
    device: 'mobile',
    badge: 'Sócio-fundador',
    image: '/projects/dumply-home.png',
    desc: 'Marketplace onde estabelecimentos revertem perdas vendendo alimentos de qualidade próximos da validade por preços menores. Inclui a dumply Feira: catálogo para produtores e vendedores de hortifrúti ganharem um novo ponto de venda dentro da plataforma.',
    stack: ['React Native', 'Node.js', 'Geolocalização', 'Pagamentos'],
    steps: [
      {
        image: '/projects/dumply-home.png',
        region: { x: 8, y: 17, w: 84, h: 20 },
        title: 'dumply Feira',
        text: 'Catálogo dentro da plataforma para produtores de hortifrúti venderem direto — um novo ponto de vendas.',
      },
      {
        image: '/projects/dumply-home.png',
        region: { x: 8, y: 42.5, w: 84, h: 29.5 },
        title: 'Ofertas perto de você',
        text: 'Estabelecimentos revertem perdas: alimentos de qualidade perto da validade, bem mais baratos — com entrega ou retirada.',
      },
      {
        image: '/projects/dumply-carrinho.png',
        region: { x: 6, y: 46, w: 88, h: 52 },
        title: 'Entrega ou retirada',
        text: 'Receber em casa ou retirar na loja sem custo — e o resumo mostra quanto se economiza comprando pela dumply.',
      },
      {
        image: '/projects/dumply-pedidos.png',
        region: { x: 6, y: 23.5, w: 88, h: 26 },
        title: 'Acompanhamento de pedidos',
        text: 'Status em tempo real — em rota, concluído ou cancelado — com origem e destino de cada entrega.',
      },
      {
        image: '/projects/dumply-mapa.png',
        region: { x: 0, y: 0, w: 100, h: 100 },
        title: 'Localização precisa',
        text: 'Confirmação de endereço com pin no mapa e precisão em metros, para a entrega chegar exata.',
      },
    ],
  },
  {
    name: 'Pointt — Agenda Whitelabel',
    url: 'younic.app/vintagebarber',
    variant: 'dashboard',
    image: '/projects/pointt-agenda.png',
    badge: 'Fundador',
    desc: 'Sistema de gerenciamento de agenda criado por mim — da ideia ao código. Um whitelabel completo para negócios gerenciarem agendas, colaboradores, produtos e caixa, com uma página própria de divulgação e agendamento para cada cliente.',
    stack: ['React', 'Node.js', 'PostgreSQL', 'Whitelabel'],
    steps: [
      {
        image: '/projects/pointt-agenda.png',
        region: { x: 17, y: 12, w: 82, h: 85 },
        title: 'Agenda semanal e mensal',
        text: 'Visão por semana ou mês, com linha do tempo ao vivo, bloqueios de horário e filtro por profissional.',
      },
      {
        image: '/projects/pointt-negocio.png',
        region: { x: 35, y: 17, w: 46, h: 74.5 },
        title: 'Gestão de colaboradores',
        text: 'Disponibilidade por dia da semana com intervalos, planos e permissões — cada colaborador com a própria agenda.',
      },
      {
        image: '/projects/pointt-caixa.png',
        region: { x: 30, y: 19, w: 49, h: 10 },
        title: 'Dashboard com dados valiosos',
        text: 'Rendimentos, gastos, reembolsos e produtos vendidos — os números que importam, comparados com o mês anterior.',
      },
      {
        image: '/projects/pointt-caixa.png',
        region: { x: 17, y: 25, w: 81.5, h: 65 },
        title: 'Gestão de produtos',
        text: 'Produtos com status, forma de pagamento e cliente — vendas, devoluções e estoque sob controle.',
      },
    ],
  },
  {
    name: 'Pelvic — Gestão de Clínica com IA',
    url: 'app.pelvic.com.br/dashboard',
    variant: 'dashboard',
    image: '/projects/pelvic-dashboard.png',
    desc: 'Plataforma de gestão de agendamentos com disparo de mensagens, gestão de conversas e IA que confirma e remarca consultas sozinha — um SDR embutido. Um sistema autossuficiente que substitui um setor inteiro da empresa.',
    stack: ['React', 'Node.js', 'WhatsApp API', 'IA + N8N'],
    steps: [
      {
        image: '/projects/pelvic-dashboard.png',
        region: { x: 0, y: 0, w: 15.8, h: 100 },
        title: 'Módulos do sistema',
        text: 'Dashboard, estatísticas, conversas, agendamentos, agendas e procedimentos — toda a operação da clínica em um só lugar.',
      },
      {
        image: '/projects/pelvic-dashboard.png',
        region: { x: 16.5, y: 13, w: 69.5, h: 36 },
        title: 'Métricas em tempo real',
        text: 'Confirmações, desmarques, faltas e pacientes únicos do mês — a saúde da agenda em um olhar.',
      },
      {
        image: '/projects/pelvic-dashboard.png',
        region: { x: 16.5, y: 51.5, w: 82.5, h: 33 },
        title: 'Análise visual',
        text: 'Status dos agendamentos do dia e conversas iniciadas nos últimos 7 dias.',
      },
      {
        image: '/projects/pelvic-conversas.png',
        region: { x: 15.8, y: 7.5, w: 19.5, h: 91 },
        title: 'Central de conversas',
        text: 'A IA conversa com os pacientes: confirma presença, responde dúvidas e remarca sozinha — o SDR embutido em ação.',
      },
      {
        image: '/projects/pelvic-agendamentos.png',
        region: { x: 16.8, y: 22, w: 82.5, h: 54 },
        title: 'Agendas por profissional',
        text: 'Visão diária lado a lado, com status coloridos por consulta e criação rápida de novos horários.',
      },
    ],
  },
  {
    name: 'Geisa Estética — Gestão de Clínica',
    url: 'app.geisaestetica.com.br/dashboard',
    variant: 'crm',
    image: '/projects/geisa-dashboard.png',
    desc: 'Sistema de gerenciamento de agendamentos, anamneses e clientes com IA integrada — do calendário por profissional às conversas do WhatsApp atendidas automaticamente, com escalonamento para humano quando necessário.',
    stack: ['React', 'Node.js', 'WhatsApp API', 'IA + N8N'],
    steps: [
      {
        image: '/projects/geisa-dashboard.png',
        region: { x: 17, y: 17.5, w: 80.5, h: 14.5 },
        title: 'Visão geral do negócio',
        text: 'Novos clientes, atendimentos em progresso e agendamentos confirmados — o pulso da clínica por dia, semana, mês ou ano.',
      },
      {
        image: '/projects/geisa-dashboard.png',
        region: { x: 17, y: 33.5, w: 80.5, h: 43 },
        title: 'Evolução e status',
        text: 'Evolução de novos clientes e status dos atendimentos, com faltas, desmarques e pendências de follow-up.',
      },
      {
        image: '/projects/geisa-calendario.png',
        region: { x: 16, y: 9.5, w: 17.5, h: 47 },
        title: 'Calendário por profissional',
        text: 'Navegação por data e filtro por profissional — a agenda de cada um, isolada ou em conjunto.',
      },
      {
        image: '/projects/geisa-calendario.png',
        region: { x: 33, y: 9.5, w: 65, h: 87 },
        title: 'Agenda do dia',
        text: 'Linha do tempo hora a hora com o marcador "Agora" — os agendamentos do dia em contexto.',
      },
      {
        image: '/projects/geisa-chats.png',
        region: { x: 16, y: 8, w: 17.5, h: 88 },
        title: 'Chats com IA',
        text: 'Conversas classificadas entre IA, aguardando e humano — a IA atende sozinha e escala quando precisa.',
      },
    ],
  },
]

export default function DevSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const browserRefs = useRef<(HTMLDivElement | null)[]>([])
  const [activeTour, setActiveTour] = useState<number | null>(null)
  // print exibido durante o tour (passos podem navegar entre telas)
  const [stepImage, setStepImage] = useState<string | null>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      // cabeçalho entra uma vez, simples
      gsap.from('.dev-section__header', {
        y: 50,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 80%', once: true },
      })

      // cada projeto é um cartão 3D próprio: levanta ao entrar, assenta
      // enquanto é visto e tomba ao sair — o ritmo acontece entre projetos
      const projects = gsap.utils.toArray<HTMLElement>('.project')
      projects.forEach((el, i) => {
        gsap.set(el, { transformPerspective: 1200 })

        gsap.fromTo(
          el,
          { rotateX: 10, y: 70, scale: 0.97, opacity: 0.25, transformOrigin: '50% 100%' },
          {
            rotateX: 0,
            y: 0,
            scale: 1,
            opacity: 1,
            ease: 'none',
            scrollTrigger: { trigger: el, start: 'top 96%', end: 'top 55%', scrub: true },
          },
        )

        if (i < projects.length - 1) {
          gsap.fromTo(
            el,
            { rotateX: 0, y: 0, scale: 1, opacity: 1, transformOrigin: '50% 0%' },
            {
              rotateX: -7,
              y: -40,
              scale: 0.96,
              opacity: 0.3,
              ease: 'none',
              immediateRender: false,
              scrollTrigger: { trigger: el, start: 'bottom 35%', end: 'bottom 5%', scrub: true },
            },
          )
        }
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  function openTour(index: number) {
    const browser = browserRefs.current[index]
    if (!browser) return

    // pré-carrega todas as telas do tour: troca de passo sem salto de layout
    PROJECTS[index].steps.forEach((s) => {
      if (s.image) new Image().src = s.image
    })

    // neutraliza as transformações 3D das seções: o spotlight precisa
    // medir a página "plana" para alinhar com precisão
    document.body.classList.add('tour-open')

    // centraliza o mockup na tela antes de abrir o spotlight
    const lenis = lenisStore.lenis
    if (lenis) {
      lenis.scrollTo(browser, {
        offset: -(window.innerHeight - browser.offsetHeight) / 2,
        duration: 0.7,
        onComplete: () => setActiveTour(index),
      })
    } else {
      browser.scrollIntoView({ block: 'center' })
      setActiveTour(index)
    }
  }

  function closeTour() {
    setActiveTour(null)
    setStepImage(null)
    document.body.classList.remove('tour-open')
  }

  return (
    <section ref={sectionRef} className="section dev-section" id="projetos">
      <header className="dev-section__header">
        <h2 className="dev-section__title">
          Sistemas que sustentam
          <br />
          <em>operações reais</em>
        </h2>
      </header>

      {PROJECTS.map((p, i) => (
        <article key={p.name} className="project">
          <div>
            <div className="project__index">
              PROJETO 0{i + 1}
              {p.badge && <span className="project__badge">★ {p.badge}</span>}
            </div>
            <h3 className="project__name">{p.name}</h3>
            <p className="project__desc">{p.desc}</p>
            <div className="project__stack">
              {p.stack.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
            <button className="project__tour-btn" onClick={() => openTour(i)}>
              Tour guiado
            </button>
          </div>

          <div style={{ perspective: 1200 }} onClick={() => openTour(i)}>
            <BrowserMockup
              ref={(el) => {
                browserRefs.current[i] = el
              }}
              variant={p.variant}
              url={p.url}
              device={p.device}
              image={activeTour === i && stepImage ? stepImage : p.image}
              imageAlt={`Tela do sistema ${p.name}`}
            />
          </div>
        </article>
      ))}

      {activeTour !== null && browserRefs.current[activeTour] && (
        <ProjectTour
          steps={PROJECTS[activeTour].steps}
          container={browserRefs.current[activeTour]!}
          onClose={closeTour}
          onStepChange={(step) => {
            if (step.image) setStepImage(step.image)
          }}
        />
      )}
    </section>
  )
}
