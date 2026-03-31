'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface QuickBooksIntegrationProps {
  orgId: string
}

interface SyncResult {
  success: boolean
  total_qbo_projects: number
  added: number
  skipped: number
  message: string
}

export default function QuickBooksIntegration({ orgId }: QuickBooksIntegrationProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [error, setError] = useState('')

  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const checkConnection = useCallback(async () => {
    const { data } = await supabase
      .from('qbo_connections')
      .select('id, updated_at')
      .eq('org_id', orgId)
      .maybeSingle()

    setIsConnected(!!data)
    if (data?.updated_at) {
      setLastSync(data.updated_at)
    }
    setLoading(false)
  }, [orgId, supabase])

  useEffect(() => {
    checkConnection()
  }, [checkConnection])

  // Check URL params for connection result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') === 'true') {
      setIsConnected(true)
      setError('')
      // Clean URL
      window.history.replaceState({}, '', '/dashboard/quickbooks')
      // Auto-sync after connecting
      handleSync()
    }
    const errorParam = params.get('error')
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        connection_denied: 'QuickBooks connection was denied. Please try again.',
        missing_params: 'Invalid callback from QuickBooks. Please try again.',
        invalid_state: 'Security check failed. Please try again.',
        unauthorized: 'You are not authorized to connect QuickBooks for this organization.',
        storage_failed: 'Failed to save QuickBooks connection. Please try again.',
        token_exchange_failed: 'Failed to authenticate with QuickBooks. Please try again.',
      }
      setError(errorMessages[errorParam] || 'An error occurred connecting to QuickBooks.')
      window.history.replaceState({}, '', '/dashboard/quickbooks')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSync() {
    setSyncing(true)
    setError('')
    setSyncResult(null)

    try {
      const res = await fetch('/api/qbo/sync', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Sync failed')
        if (res.status === 401 && data.error?.includes('expired')) {
          setIsConnected(false)
        }
      } else {
        setSyncResult(data)
        setLastSync(new Date().toISOString())
      }
    } catch (err) {
      setError('Network error during sync. Please try again.')
    }

    setSyncing(false)
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect QuickBooks? Existing jobs will not be removed.')) return

    const { error: deleteError } = await supabase
      .from('qbo_connections')
      .delete()
      .eq('org_id', orgId)

    if (deleteError) {
      setError('Failed to disconnect. Please try again.')
    } else {
      setIsConnected(false)
      setSyncResult(null)
      setLastSync(null)
    }
  }

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-[10px] p-6">
        <div className="text-[13px] text-text-secondary">Loading QuickBooks status...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Connection Status Card */}
      <div className="bg-surface border border-border rounded-[10px] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#2CA01C] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-[14px]">QB</span>
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-text-primary">QuickBooks Online</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green' : 'bg-text-muted'}`}
                />
                <span className="text-[12px] text-text-secondary">
                  {isConnected ? 'Connected' : 'Not connected'}
                </span>
              </div>
            </div>
          </div>

          {isConnected ? (
            <div className="flex gap-2">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-[13px] font-medium rounded-sm transition-colors disabled:opacity-50"
              >
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 border border-border text-[13px] font-medium text-text-secondary hover:text-red hover:border-red rounded-sm transition-colors"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <a
              href="/api/qbo/connect"
              className="px-4 py-2 bg-[#2CA01C] hover:bg-[#248017] text-white text-[13px] font-medium rounded-sm transition-colors inline-block"
            >
              Connect QuickBooks
            </a>
          )}
        </div>

        {/* Description */}
        <p className="text-[13px] text-text-secondary">
          {isConnected
            ? 'QuickBooks Projects are automatically synced as jobs every hour. You can also sync manually.'
            : 'Connect your QuickBooks Online account to automatically sync Projects as jobs in the time tracker.'}
        </p>

        {lastSync && (
          <p className="text-[11px] text-text-muted mt-2">
            Last synced: {new Date(lastSync).toLocaleString()}
          </p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-light border border-red/20 rounded-[10px] p-4">
          <p className="text-[13px] text-red">{error}</p>
        </div>
      )}

      {/* Sync Result */}
      {syncResult && (
        <div className="bg-green-light border border-green/20 rounded-[10px] p-4">
          <p className="text-[13px] text-green font-medium">{syncResult.message}</p>
          <div className="mt-2 text-[12px] text-text-secondary">
            <span>QBO Projects found: {syncResult.total_qbo_projects}</span>
            <span className="mx-2">·</span>
            <span>New jobs added: {syncResult.added}</span>
            <span className="mx-2">·</span>
            <span>Already synced: {syncResult.skipped}</span>
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="bg-surface border border-border rounded-[10px] p-6">
        <h3 className="text-[14px] font-semibold text-text-primary mb-3">How it works</h3>
        <div className="space-y-2 text-[13px] text-text-secondary">
          <p>1. Connect your QuickBooks Online account using the button above.</p>
          <p>2. Your QBO Projects are automatically synced as jobs every hour.</p>
          <p>3. New projects added in QuickBooks will appear as jobs automatically.</p>
          <p>4. Existing jobs with matching names are linked but not duplicated.</p>
          <p>5. Disconnecting QuickBooks will stop syncing but won&apos;t remove existing jobs.</p>
        </div>
      </div>
    </div>
  )
}
