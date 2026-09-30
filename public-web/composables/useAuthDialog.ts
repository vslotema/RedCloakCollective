export type AuthDialogMode = 'signin' | 'signup'

export function useAuthDialog() {
  const isOpen = useState('auth-dialog-open', () => false)
  const mode = useState<AuthDialogMode>('auth-dialog-mode', () => 'signup')

  function open(nextMode: AuthDialogMode) {
    mode.value = nextMode
    isOpen.value = true
  }

  return { isOpen, mode, open }
}
