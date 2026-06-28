import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { PrivacyContext, PRIVACY_STORAGE_KEY } from './privacy-context'

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [valuesHidden, setValuesHidden] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.localStorage.getItem(PRIVACY_STORAGE_KEY) === 'true'
  })

  const toggleValuesHidden = useCallback(() => {
    setValuesHidden((current) => {
      const nextValue = !current
      window.localStorage.setItem(PRIVACY_STORAGE_KEY, String(nextValue))
      return nextValue
    })
  }, [])

  const contextValue = useMemo(
    () => ({
      toggleValuesHidden,
      valuesHidden,
    }),
    [toggleValuesHidden, valuesHidden],
  )

  return <PrivacyContext.Provider value={contextValue}>{children}</PrivacyContext.Provider>
}
