'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface SopStep { id: string; title: string; description: string; order_index: number }

const LABELS = { event: 'אירוע מבצעי', deploy: 'פריסת חפ"ק', fold: 'קיפול חפ"ק' }

export default function SopPage({ type }: { type: 'event' | 'deploy' | 'fold' }) {
  const [steps, setSteps] = useState<SopStep[]>([])

  useEffect(() => {
    supabase.from('sop_steps').select('*').eq('sop_type', type).order('order_index')
      .then(({ data }) => data && setSteps(data))
  }, [type])

  return (
    <div style={{ padding: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
        סד&quot;פ — {LABELS[type]}
      </div>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRight: '3px solid var(--red)', borderRadius: 10, padding: 14 }}>
        {steps.map((step, i) => (
          <div key={step.id} style={{ display: 'flex', gap: 12, marginBottom: i < steps.length - 1 ? 14 : 0 }}>
            <div style={{
              width: 27, height: 27, borderRadius: '50%', background: 'var(--red)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, flexShrink: 0, marginTop: 1
            }}>{i + 1}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>{step.title}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{step.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
