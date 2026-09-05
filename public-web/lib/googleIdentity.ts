declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: {
            client_id: string
            callback: (response: { credential: string }) => void
          }): void
          renderButton(
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon'
              theme?: 'outline' | 'filled_blue' | 'filled_black'
              size?: 'large' | 'medium' | 'small'
              shape?: 'rectangular' | 'pill' | 'circle' | 'square'
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
              width?: string | number
            },
          ): void
        }
      }
    }
  }
}

let scriptPromise: Promise<void> | null = null

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve()

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
      document.head.appendChild(script)
    })
  }

  return scriptPromise
}

export async function renderGoogleButton(
  el: HTMLElement,
  onCredential: (credential: string) => void,
  clientId: string,
) {
  await loadGoogleScript()

  if (!clientId) {
    console.warn('NUXT_PUBLIC_GOOGLE_CLIENT_ID is not set; Google sign-in is disabled.')
    return
  }

  window.google!.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => onCredential(response.credential),
  })

  window.google!.accounts.id.renderButton(el, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    shape: 'pill',
    text: 'continue_with',
    width: 320,
  })
}
