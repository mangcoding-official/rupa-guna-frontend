import { createContext, useContext } from 'react'

/**
 * Chapter number of the section being rendered (home page only): the page reads as a sequence of
 * numbered chapters, and each section's label shows its number ("02  Work").
 */
export const ChapterContext = createContext<number | null>(null)
export const useChapter = () => useContext(ChapterContext)
