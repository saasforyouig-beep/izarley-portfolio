import Nav from './components/layout/Nav'
import Footer from './components/layout/Footer'
import Hero from './components/sections/Hero'
import AISection from './components/sections/AISection'
import DevSection from './components/sections/DevSection'
import FeedbackSection from './components/sections/FeedbackSection'
import BooksSection from './components/sections/BooksSection'
import BlogSection from './components/sections/BlogSection'
import ContactSection from './components/sections/ContactSection'
import MarqueeTape from './components/ui/MarqueeTape'
import MusicPlayer from './components/ui/MusicPlayer'
import { useEffect } from 'react'
import { useSmoothScroll } from './hooks/useSmoothScroll'
import { useSectionTransitions } from './hooks/useSectionTransitions'
import { initTracking } from './lib/track'

export default function App() {
  useSmoothScroll()
  useSectionTransitions()

  useEffect(() => {
    initTracking()
  }, [])

  return (
    <>
      <Nav />
      <main>
        <Hero />
        <AISection />
        <MarqueeTape />
        <DevSection />
        <FeedbackSection />
        <BooksSection />
        <BlogSection />
        <ContactSection />
      </main>
      <Footer />
      <MusicPlayer />
    </>
  )
}
