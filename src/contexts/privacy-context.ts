import { createContext } from 'react'

export type PrivacyContextValue = {
  toggleValuesHidden: () => void
  valuesHidden: boolean
}

export const PRIVACY_STORAGE_KEY = 'lumberlog-hide-values'

export const PrivacyContext = createContext<PrivacyContextValue | null>(null)
