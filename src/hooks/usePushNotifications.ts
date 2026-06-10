'use client'

import { useState, useEffect } from 'react'

export type PushStatus = 'unknown' | 'unsupported' | 'needs-pwa' | 'blocked' | 'default' | 'subscribed'

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>('unknown')

  useEffect(() => {
    if (typeof window === 'undefined') return
    detectStatus()
  }, [])

  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent)
  }

  function isPWA() {
    return window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
  }

  async function detectStatus() {
    // בדוק תמיכה בסיסית
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      // iOS Safari דורש PWA
      if (isIOS() && !isPWA()) {
        setStatus('needs-pwa')
      } else {
        setStatus('unsupported')
      }
      return
    }

    // iOS Safari עם PushManager דורש PWA
    if (isIOS() && !isPWA()) {
      setStatus('needs-pwa')
      return
    }

    if (Notification.permission === 'denied') {
      setStatus('blocked')
      return
    }

    // בדוק אם כבר רשום
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) { setStatus('subscribed'); return }
      }
    } catch {}

    setStatus('default')
  }

  async function subscribe(userLabel = 'משתמש'): Promise<boolean> {
    if (status === 'needs-pwa' || status === 'unsupported' || status === 'blocked') return false

    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const perm = await Notification.requestPermission()
      if (perm === 'denied') { setStatus('blocked'); return false }
      if (perm !== 'granted') return false

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
      })

      await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), userLabel })
      })

      setStatus('subscribed')
      return true
    } catch (err) {
      console.error('Push error:', err)
      return false
    }
  }

  async function unsubscribe() {
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      if (!reg) return
      const sub = await reg.pushManager.getSubscription()
      if (!sub) return
      await fetch('/api/push-subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint })
      })
      await sub.unsubscribe()
      setStatus('default')
    } catch {}
  }

  return { status, subscribe, unsubscribe }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}
