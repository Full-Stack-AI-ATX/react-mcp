import type { Topic } from '@Types/workspace';


export const topics: Topic[] = [
  {
    id: 'cloud-management',
    name: 'Cloud Management',
    description: 'Cloud resources, scaling, and cost optimization',
    icon: 'Cloud',
    color: 'var(--topic-color-cyan)',
    status: 'active',
    lastActivity: '3 minutes ago',
    metrics: {
      instances: 28,
      cost: '$1,247/mo',
      efficiency: '87%'
    }
  },
  {
    id: 'kubernetes',
    name: 'Kubernetes',
    description: 'Cluster management, nodes, and deployments',
    icon: 'Server',
    color: 'var(--topic-color-purple)',
    status: 'active',
    lastActivity: '1 minute ago',
    metrics: {
      nodes: 12,
      pods: 156,
      cpu: '68%'
    }
  },
  {
    id: 'database',
    name: 'Database Management',
    description: 'Data integrations, migrations, and operations',
    icon: 'Database',
    color: 'var(--topic-color-blue)',
    status: 'active',
    lastActivity: '2 minutes ago',
    metrics: {
      connections: 45,
      queries: '1.2K/min',
      latency: '12ms'
    }
  },
  {
    id: 'observability',
    name: 'Observability',
    description: 'Monitoring, performance, traces, and errors',
    icon: 'Activity',
    color: 'var(--topic-color-green)',
    status: 'warning',
    lastActivity: '5 minutes ago',
    metrics: {
      uptime: '99.9%',
      errors: 3,
      alerts: 1
    }
  },
  {
    id: 'security',
    name: 'Security',
    description: 'API security, vulnerabilities, and compliance',
    icon: 'Shield',
    color: 'var(--topic-color-red)',
    status: 'error',
    lastActivity: '30 seconds ago',
    metrics: {
      threats: 2,
      scans: 'Daily',
      compliance: '94%'
    }
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Data insights, reports, and business intelligence',
    icon: 'BarChart3',
    color: 'var(--topic-color-orange)',
    status: 'idle',
    lastActivity: '1 hour ago',
    metrics: {
      reports: 23,
      queries: '450/day',
      storage: '2.1TB'
    }
  }
];
