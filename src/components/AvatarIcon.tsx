import { useState } from 'react'
import { getPngIconPath } from '../lib/identity'

type Props = {
  username: string
  size?: number
  className?: string
}

export function AvatarIcon({ username, size = 30, className = '' }: Props) {
  const [error, setError] = useState(false)
  const iconPath = getPngIconPath(username)

  if (error) {
    return (
      <img
        src="/icon.png"
        alt={username}
        width={size}
        height={size}
        className={`avatar-icon ${className}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 0 12px rgba(45, 212, 191, 0.2)',
        }}
      />
    )
  }

  return (
    <img
      src={iconPath}
      alt={username}
      width={size}
      height={size}
      className={`avatar-icon ${className}`}
      onError={() => setError(true)}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        objectFit: 'cover',
        border: '2px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 0 12px rgba(45, 212, 191, 0.2)',
      }}
    />
  )
}
