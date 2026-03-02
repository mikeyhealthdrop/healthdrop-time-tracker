'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatTimer } from '@/lib/utils';

interface TimeEntry {
  id: string;
  clock_in: string;
  clock_out: string | null;
  on_lunch: boolean;
  job_id: string | null;
  user_id: string;
  job?: {
    number: string;
  };
  user?: {
    first_name: string;
    last_name: string;
  };
}

interface LiveDashboardProps {
  orgId: string;
}

export default function LiveDashboard({ orgId }: LiveDashboardProps) {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState<Record<string, number>>({});
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionRef = useRef<any>(null);

  const fetchActiveEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select(
          `
          id,
          clock_in,
          clock_out,
          on_lunch,
          job_id,
          user_id,
          job:jobs(number),
          user:users(first_name, last_name)
        `
        )
        .eq('organization_id', orgId)
        .is('clock_out', null);

      if (error) throw error;

      setTimeEntries(data || []);
      initializeElapsedSeconds(data || []);
    } catch (error) {
      console.error('Error fetching active time entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeElapsedSeconds = (entries: TimeEntry[]) => {
    const now = Date.now();
    const newElapsed: Record<string, number> = {};

    entries.forEach((entry) => {
      const clockInTime = new Date(entry.clock_in).getTime();
      const elapsedMs = now - clockInTime;
      newElapsed[entry.id] = Math.floor(elapsedMs / 1000);
    });

    setElapsedSeconds(newElapsed);
  };

  useEffect(() => {
    fetchActiveEntries();

    subscriptionRef.current = supabase
      .channel(`time_entries:${orgId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_entries',
          filter: `organization_id=eq.${orgId}`,
        },
        () => {
          fetchActiveEntries();
        }
      )
      .subscribe();

    refreshIntervalRef.current = setInterval(() => {
      fetchActiveEntries();
    }, 30000);

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [orgId, supabase]);

  useEffect(() => {
    timerIntervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((key) => {
          updated[key] += 1;
        });
        return updated;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const totalClockedIn = timeEntries.length;
  const onLunch = timeEntries.filter((entry) => entry.on_lunch).length;
  const working = totalClockedIn - onLunch;

  const formatClockInTime = (clockInTime: string) => {
    const date = new Date(clockInTime);
    return date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-[10px] p-5 shadow-sm">
          <div className="text-text-secondary text-sm mb-2">Total Clocked In</div>
          <div className="text-4xl font-bold text-green bg-green-light rounded-lg p-4 text-center">
            {totalClockedIn}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-[10px] p-5 shadow-sm">
          <div className="text-text-secondary text-sm mb-2">On Lunch</div>
          <div className="text-4xl font-bold text-orange bg-orange-light rounded-lg p-4 text-center">
            {onLunch}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-[10px] p-5 shadow-sm">
          <div className="text-text-secondary text-sm mb-2">Working</div>
          <div className="text-4xl font-bold text-green bg-green-light rounded-lg p-4 text-center">
            {working}
          </div>
        </div>
      </div>

      {totalClockedIn === 0 ? (
        <div className="bg-surface border border-border rounded-[10px] p-12 shadow-sm flex items-center justify-center">
          <div className="text-center">
            <div className="text-text-secondary mb-2">No one is currently clocked in</div>
            <div className="text-text-muted text-sm">Check back when employees start their shifts</div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {timeEntries.map((entry) => {
            const firstName = entry.user?.first_name || '';
            const lastName = entry.user?.last_name || '';
            const fullName = `${firstName} ${lastName}`.trim();
            const jobNumber = entry.on_lunch ? 'Lunch Break' : entry.job?.number || 'No Job';
            const elapsed = elapsedSeconds[entry.id] || 0;

            return (
              <div
                key={entry.id}
                className="bg-surface border border-border rounded-[10px] p-5 shadow-sm"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-text-primary">{fullName}</h3>
                    <div className="text-text-secondary text-xs mt-1">
                      {formatClockInTime(entry.clock_in)}
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      entry.on_lunch
                        ? 'bg-orange-light text-orange'
                        : 'bg-green-light text-green'
                    }`}
                  >
                    {entry.on_lunch ? 'On Lunch' : 'Working'}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-text-secondary text-xs mb-1">
                    {entry.on_lunch ? 'Lunch Break' : 'Job'}
                  </div>
                  <div className="text-text-primary font-medium">{jobNumber}</div>
                </div>

                <div className="bg-surface border border-border rounded-lg p-3">
                  <div className="text-text-secondary text-xs mb-1">Elapsed Time</div>
                  <div className="text-2xl font-bold text-text-primary">
                    {formatTimer(elapsed)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
