export function getSupabaseErrorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== 'object' || !('message' in error)) {
    return fallback
  }

  const message = String(error.message || fallback)
  const normalized = message.toLowerCase()

  if (
    normalized.includes('permission denied for table') ||
    normalized.includes('row-level security') ||
    normalized.includes('permission denied for schema')
  ) {
    return 'O banco ainda não liberou acesso para o app. Rode o arquivo supabase/policies.sql no SQL Editor do Supabase e faça login novamente.'
  }

  if (normalized.includes('foreign key')) {
    return 'Esse cadastro não pode ser excluído porque possui vínculos com outros registros.'
  }

  return message
}
