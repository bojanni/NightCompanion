import type { ReactNode } from 'react'

type PageContainerProps = {
  children: ReactNode
  className?: string
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div
      className={[
        'w-full min-[1000px]:w-[1000px] min-[1000px]:mx-auto',
        className,
      ].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  )
}
