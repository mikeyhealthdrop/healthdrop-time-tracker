import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchQBOProjects } from '@/lib/qbo'

/**
 * GET /api/cron/qbo-sync
 * Cron endpoint called by Vercel Cron Jobs every hour.
 * Syncs QBO projects for all connected orgs.
 */
export async function GET(request: NextRequest) {
  // Verify this is called by Vercel Cron (authorization header)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow if no CRON_SECRET is set (for initial setup)
    if (process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const serviceClient = await createServiceClient()

  // Get all orgs with QBO connections
  const { data: connections, error } = await serviceClient
    .from('qbo_connections')
    .select('*')

  if (error || !connections || connections.length === 0) {
    return NextResponse.json({ message: 'No QBO connections to sync', synced: 0 })
  }

  const results = []

  for (const connection of connections) {
    try {
      const { projects } = await fetchQBOProjects(
        connection.realm_id,
        connection.access_token,
        connection.refresh_token,
        async (newTokens) => {
          await serviceClient
            .from('qbo_connections')
            .update({
              access_token: newTokens.access_token,
              refresh_token: newTokens.refresh_token,
              token_expires_at: new Date(
                Date.now() + newTokens.expires_in * 1000
              ).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('org_id', connection.org_id)
        }
      )

      // Get existing QBO-linked jobs
      const { data: existingJobs } = await serviceClient
        .from('jobs')
        .select('id, qbo_project_id')
        .eq('org_id', connection.org_id)
        .not('qbo_project_id', 'is', null)

      const existingQboIds = new Set(
        (existingJobs || []).map((j: any) => j.qbo_project_id)
      )

      let added = 0
      for (const project of projects) {
        if (existingQboIds.has(project.Id)) continue

        // Check by name too
        const { data: existingByName } = await serviceClient
          .from('jobs')
          .select('id')
          .eq('org_id', connection.org_id)
          .eq('job_number', project.ProjectName)
          .maybeSingle()

        if (existingByName) {
          await serviceClient
            .from('jobs')
            .update({ qbo_project_id: project.Id })
            .eq('id', existingByName.id)
          continue
        }

        const { error: insertError } = await serviceClient
          .from('jobs')
          .insert({
            org_id: connection.org_id,
            job_number: project.ProjectName,
            qbo_project_id: project.Id,
            is_active: true,
          })

        if (!insertError) added++
      }

      results.push({
        org_id: connection.org_id,
        projects_found: projects.length,
        added,
        status: 'success',
      })
    } catch (err: any) {
      console.error(`Cron QBO sync failed for org ${connection.org_id}:`, err)
      results.push({
        org_id: connection.org_id,
        status: 'error',
        error: err.message,
      })
    }
  }

  return NextResponse.json({
    message: `Synced ${connections.length} org(s)`,
    results,
  })
}
