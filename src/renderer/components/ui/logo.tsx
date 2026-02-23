import { cn } from "../../lib/utils"
import logoSrc from "../../assets/app-icons/logo-black.svg"

interface LogoProps {
  className?: string
}

export function Logo({ className }: LogoProps) {
  return (
    <img
      src={logoSrc}
      alt="Maestro logo"
      className={cn("w-full h-full dark:invert", className)}
    />
  )
}
