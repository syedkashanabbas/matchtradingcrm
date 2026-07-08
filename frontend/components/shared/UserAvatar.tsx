'use client';

import Image from 'next/image';
import { useState } from 'react';

interface UserAvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

export function UserAvatar({ src, name, size = 'md', className = '' }: UserAvatarProps) {
  const [hasError, setHasError] = useState(false);

  const initials = (name ?? "User")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const sizeClass = sizeMap[size];

  if (src && !hasError) {
    return (
      <div className={`${sizeClass} ${className} relative overflow-hidden rounded-full bg-gradient-to-br from-purple-400 to-blue-500`}>
        <Image
          src={src}
          alt={name}
          fill
          className="object-cover"
          onError={() => setHasError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} ${className} flex items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-blue-500 font-semibold text-white`}
      title={name}
    >
      {initials}
    </div>
  );
}
