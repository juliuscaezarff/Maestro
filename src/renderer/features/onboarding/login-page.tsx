import { useState } from "react"

type Props = {
  onLogin: () => void
}

export function LoginPage({ onLogin }: Props) {
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    setIsLoading(true)
    try {
      await window.desktopApi?.startAuthFlow()
      // Poll until user is authenticated
      const interval = setInterval(async () => {
        const user = await window.desktopApi?.getUser()
        if (user) {
          clearInterval(interval)
          onLogin()
        }
      }, 1000)
    } catch (err) {
      console.error("[LoginPage] Auth flow error:", err)
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-background text-foreground gap-6">
      <svg width="32" height="32" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M358.333 0C381.345 0 400 18.6548 400 41.6667V295.833C400 298.135 398.134 300 395.833 300H270.833C268.532 300 266.667 301.865 266.667 304.167V395.833C266.667 398.134 264.801 400 262.5 400H41.6667C18.6548 400 0 381.345 0 358.333V304.72C0 301.793 1.54269 299.081 4.05273 297.575L153.76 207.747C157.159 205.708 156.02 200.679 152.376 200.065L151.628 200H4.16667C1.86548 200 0 198.135 0 195.833V104.167C0 101.865 1.86548 100 4.16667 100H162.5C164.801 100 166.667 98.1345 166.667 95.8333V4.16667C166.667 1.86548 168.532 0 170.833 0H358.333ZM170.833 100C168.532 100 166.667 101.865 166.667 104.167V295.833C166.667 298.135 168.532 300 170.833 300H262.5C264.801 300 266.667 298.135 266.667 295.833V104.167C266.667 101.865 264.801 100 262.5 100H170.833Z"
          fill="currentColor"
          className="text-foreground/80"
        />
      </svg>

      <div className="flex flex-col items-center gap-1">
        <h1 className="text-sm font-medium">Sign in to Maestro</h1>
        <p className="text-xs text-muted-foreground">Continue in your browser</p>
      </div>

      <button
        type="button"
        onClick={handleLogin}
        disabled={isLoading}
        className="h-8 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium transition-[background-color,transform] duration-150 hover:bg-primary/90 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Opening browser..." : "Sign in"}
      </button>
    </div>
  )
}
