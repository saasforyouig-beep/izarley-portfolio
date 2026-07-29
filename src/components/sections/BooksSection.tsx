import { useEffect, useRef } from 'react'
import gsap from 'gsap'

type Book = {
  title: string
  author: string
  note: string
  cover?: string
}

const BOOKS: Book[] = [
  // programação primeiro
  {
    title: 'Fundamentals of Software Architecture',
    author: 'Mark Richards & Neal Ford',
    note: 'Arquitetura é sobre trade-offs, não certezas.',
    cover: '/books/fundamentals-software-architecture.jpg',
  },
  {
    title: 'O Programador Pragmático',
    author: 'Hunt & Thomas',
    note: 'O manual de quem constrói software de verdade.',
    cover: '/books/programador-pragmatico.jpg',
  },
  {
    title: 'Gatilhos Mentais',
    author: 'Gustavo Ferreira',
    note: 'Persuasão é entender pessoas antes de vender.',
    cover: '/books/gatilhos-mentais.jpg',
  },
  {
    title: 'A Única Coisa',
    author: 'Gary Keller & Jay Papasan',
    note: 'Foco extremo: uma coisa de cada vez.',
    cover: '/books/a-unica-coisa.jpg',
  },
  {
    title: 'Como Fazer Amigos e Influenciar Pessoas',
    author: 'Dale Carnegie',
    note: 'Toda influência começa em ouvir de verdade.',
    cover: '/books/como-fazer-amigos.jpg',
  },
  {
    title: 'As Coisas Que Você Só Vê Quando Desacelera',
    author: 'Haemin Sunim',
    note: 'Desacelerar também é uma forma de produtividade.',
    cover: '/books/desacelera.jpg',
  },
]

export default function BooksSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.book', {
        y: 50,
        opacity: 0,
        stagger: 0.08,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 70%', once: true },
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="section section--auto books-section" id="livros">
      <header className="books-section__header">
        <h2 className="section-title">
          Livros Lidos &amp; <em>Recomendados</em>
        </h2>
      </header>

      <div className="books-grid">
        {BOOKS.map((b) => (
          <div key={b.title} className="book">
            <div className="book__cover">
              {b.cover ? (
                <img src={b.cover} alt={`Capa do livro ${b.title}, de ${b.author}`} loading="lazy" />
              ) : (
                <>
                  <span className="book__spine" />
                  <span className="book__cover-title">{b.title}</span>
                  <span className="book__cover-author">{b.author}</span>
                </>
              )}
            </div>
            <p className="book__note">{b.note}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
