import * as React from 'react';
import styles     from './styles.module.css';


export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variantClass = {
    default:      styles.default,
    secondary:    styles.secondary,
    outline:      styles.outline,
    success:      styles.success,
    warning:      styles.warning,
    destructive:  styles.destructive
  }[variant || 'default'];

  return (
    <div
      className={`${styles.badge} ${variantClass} ${className || ''}`}
      {...props}
    />
  )
}


export default Badge;
