'use client';

import React    from 'react';
import { Bot }  from 'lucide-react';
import styles   from './styles.module.css';


const AgentIntro = () => {
  return (
    <div className={styles['container']}>
      <Bot className={styles['icon']} />
      <div>
        <h3 className={styles['title']}>General Agent Assistant</h3>
        <p className={styles['description']}>
          I can help you with general questions about your infrastructure, or you can select a specific topic for specialized assistance.
        </p>
      </div>
    </div>
  );
};


export default AgentIntro;
