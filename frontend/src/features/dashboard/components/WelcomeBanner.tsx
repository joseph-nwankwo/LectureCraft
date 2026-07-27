import { Sparkles, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/design-system/buttons/Button'
import { ROUTES } from '@/constants/routes'

interface WelcomeBannerProps {
  name?: string
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function WelcomeBanner({ name }: WelcomeBannerProps) {
  const navigate = useNavigate()
  const greeting = getGreeting()
  const displayName = name?.split(' ')[0] ?? 'Professor'
  const dayMsg = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())

  return (
    <div className="relative overflow-hidden rounded-xl bg-background border border-border px-5 py-4 shadow-sm">
      <div className="relative flex items-center justify-between gap-4">
        <div className="space-y-0.5 min-w-0">
          <p className="text-xs text-muted-foreground font-medium">{dayMsg}</p>
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            {greeting}, {displayName}!
          </h1>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Your AI-powered teaching assistant is ready.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => navigate(ROUTES.AI_STUDIO)}
            className="bg-foreground text-background hover:bg-foreground/90 border-0 font-semibold"
            size="sm"
            leftIcon={<Sparkles className="h-3.5 w-3.5" />}
            rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
          >
            Open AI Studio
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(ROUTES.COURSES + '/new')}
            className="hidden sm:flex"
          >
            Create a Course
          </Button>
        </div>
      </div>
    </div>
  )
}
