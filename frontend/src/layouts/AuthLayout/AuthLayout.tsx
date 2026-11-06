import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-background via-accent/20 to-secondary/40 dark:from-background dark:via-surface-1 dark:to-surface-2 p-4">
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  )
}
