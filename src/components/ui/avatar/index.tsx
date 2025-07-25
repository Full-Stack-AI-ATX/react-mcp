'use client';

import * as React           from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';

import styles from './styles.module.css';


const Avatar = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={`${styles.root} ${className || ''}`}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={`${styles.image} ${className || ''}`}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={`${styles.fallback} ${className || ''}`}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;


export { Avatar, AvatarImage, AvatarFallback };
