import * as React from 'react';
import styles     from './styles.module.css';


export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantClass = {
    default: styles.default,
    secondary: styles.secondary,
    destructive: styles.destructive,
    outline: styles.outline
  }[variant || 'default'];

  return (
    <div
      className={`${styles.badge} ${variantClass} ${className || ''}`}
      {...props}
    />
  )
}


export default Badge;
