const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const numberFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const dateShortFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatCurrency(value: number) {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0)
}

export function formatCurrencyVisibility(value: number, hidden: boolean) {
  return hidden ? 'R$ ••••' : formatCurrency(value)
}

export function formatDateShort(value: string) {
  return dateShortFormatter.format(new Date(value))
}

export function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value))
}

export function formatQuantity(value: number, unit: string) {
  return `${numberFormatter.format(value)} ${unit}`
}

export function normalizeLabel(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase()
}

export function startOfTodayIso() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today.toISOString()
}

export function toDatetimeLocalValue(value?: string) {
  const base = value ? new Date(value) : new Date()
  base.setMinutes(base.getMinutes() - base.getTimezoneOffset())
  return base.toISOString().slice(0, 16)
}

export function toIsoFromDatetimeLocal(value: string) {
  if (!value) {
    return new Date().toISOString()
  }

  return new Date(value).toISOString()
}

export function getStatusLabel(status: string) {
  const normalized = normalizeLabel(status)

  if (normalized === 'pendente') {
    return 'Pendente'
  }

  if (normalized === 'entregue' || normalized === 'finalizada') {
    return 'Entregue'
  }

  if (normalized === 'cancelada') {
    return 'Cancelada'
  }

  if (normalized === 'aberta') {
    return 'Aberta'
  }

  return status || 'Sem status'
}
