import { useState, useEffect } from 'react'

export function useDarkMode() {
  const [dark, setDark] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('darkMode')
    if (saved !== null) setDark(saved === 'true')
  }, [])

  const toggle = () => {
    setDark(prev => {
      localStorage.setItem('darkMode', String(!prev))
      return !prev
    })
  }

  return { dark, toggle }
}
