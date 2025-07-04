'use client';

import type { LucideIcon }  from 'lucide-react';
import type { Topic }       from '@Types/workspace';

import {
  Database, Activity,
  Server, Shield,
  BarChart3, Cloud
}                           from 'lucide-react';
import {
  Card, CardContent,
  CardHeader, CardTitle
}                           from '@Components/ui/card';
import Badge                from '@Components/ui/badge';

import styles               from './styles.module.css';


const iconMap: Record<string, LucideIcon> = {
  Database,
  Activity,
  Server,
  Shield,
  BarChart3,
  Cloud,
}

interface TopicCardProps {
  topic: Topic
  isActive: boolean
  onClick: () => void
}

function TopicCard({ topic, isActive, onClick }: TopicCardProps) {
  const Icon = iconMap[topic.icon]

  const statusClassName = {
    active: styles['status-active'],
    warning: styles['status-warning'],
    error: styles['status-error'],
    idle: styles['status-idle'],
  }[topic.status];

  return (
    <Card
      className={`${styles.card} ${isActive ? styles.cardActive : ""}`}
      onClick={onClick}
    >
      <CardHeader className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.iconContainer}>
            <div className={styles.iconWrapper} style={{ backgroundColor: topic.color }}>
              <Icon className={styles.icon} />
            </div>
            <div>
              <CardTitle className={styles.title}>{topic.name}</CardTitle>
              <p className={styles.description}>{topic.description}</p>
            </div>
          </div>
          <Badge className={statusClassName}>{topic.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className={styles.content}>
        <div className={styles.contentWrapper}>
          <div className={styles.lastActivity}>
            <span className={styles.lastActivityLabel}>Last activity:</span>
            <span>{topic.lastActivity}</span>
          </div>
          {topic.metrics && (
            <div className={styles.metricsGrid}>
              {Object.entries(topic.metrics).map(([key, value]) => (
                <div key={key} className={styles.metricItem}>
                  <div className={styles.metricValue}>{value}</div>
                  <div className={styles.metricKey}>{key}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}


export default TopicCard;
