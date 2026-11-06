import { Sparkles, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/design-system/buttons/Button'
import { PageHeader } from '@/components/design-system/layout/PageHeader'
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
    <PageHeader
      title="Dashboard"
      description={(
        <>
          <span className="font-medium text-foreground">{greeting}, {displayName}.</span>{' '}
          <span>{dayMsg} · Your AI-powered teaching assistant is ready.</span>
        </>
      )}
      actions={(
        <>
          <Button
            onClick={() => navigate(ROUTES.AI_STUDIO)}
            size="sm"
            leftIcon={<Sparkles className="h-3.5 w-3.5" />}
            rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
          >
            Open AI Studio
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(ROUTES.COURSES + '/new')}
          >
            Create a Course
          </Button>
        </>
      )}
    />
  )
}
