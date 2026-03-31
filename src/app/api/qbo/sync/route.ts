import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { fetchQBOProjects } from '@/lib/qbo'

/**
 * POST /api/qbo/sync
 * Manually trigger a sync of QBO projects → jobs.
 * Admin-only endpoint.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, org_id')
    .eq('auth_id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  return syncProjectsForOrg(profile.org_id)
}

/**
 * Sync QBO projects for a given org.
 * Exported for use by the cron endpoint too.
 */
export async function syncProjectsForOrg(orgId: string): Promise<NextResponse> {
  const serviceClient = await createServiceClient()

  // Get the QBO connection for this org
  const { data: connection, error: connError } = await serviceClient
    .from('qbo_connections')
    .select('*')
    .eq('org_id', orgId)
    .single()

  if (connError || !connection) {
    return NextResponse.json(
      { error: 'No QuickBooks connection found. Please connect QuickBooks first.' },
      { status: 400 }
    )
  }

  try {
    // Fetch projects from QBO
    const { projects, accessToken, refreshToken } = await fetchQBOProjects(
      connection.realm_id,
      connection.access_token,
      connection.refresh_token,
      async (newTokens) => {
        // Update stored tokens when they get refreshed
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
          .eq('org_id', orgId)
      }
    )

    // Update tokens if they changed during the request
    if (accessToken !== connection.access_token) {
      await serviceClient
        .from('qbo_connections')
        .update({
          access_token: accessToken,
          refresh_token: refreshToken,
          updated_at: new Date().toISOString(),
        })
        .eq('org_id', orgId)
    }

    // Get existing jobs with QBO project IDs for this org
    const { data: existingJobs } = await serviceClient
      .from('jobs')
      .select('id, qbo_project_id, job_number')
      .eq('org_id', orgId)
      .not('qbo_project_id', 'is', null)

    const existingQboIds = new Set(
      (existingJobs || []).map((j: any) => j.qbo_project_id)
    )

    // Insert new projects as jobs (skip existing ones)
    let added = 0
    let skipped = 0

    for (const project of projects) {
      if (existingQboIds.has(project.Id)) {
        skipped++
        continue
      }

      // Check if a job with this name already exists (even without qbo_project_id)
      const jobNumber = project.ProjectName
      const { data: existingByName } = await serviceClient
        .from('jobs')
        .select('id')
        .eq('org_id', orgId)
        .eq('job_number', jobNumber)
        .maybeSingle()

      if (existingByName) {
        // Link the existing job to this QBO project
        await serviceClient
          .from('jobs')
          .update({ qbo_project_id: project.Id })
          .eq('id', existingByName.id)
        skipped++
        continue
      }

      // Create new job from QBO project
      const { error: insertError } = await serviceClient
        .from('jobs')
        .insert({
          org_id: orgId,
          job_number: jobNumber,
          qbo_project_id: project.Id,
          is_active: true,
        })

      if (insertError) {
        console.error(`Failed to insert job for QBO project ${project.Id}:`, insertError)
      } else {
        added++
      }
    }

    return NextResponse.json({
      success: true,
      total_qbo_projects: projects.length,
      added,
      skipped,
      message: added > 0
        ? `Synced ${added} new job(s) from QuickBooks.`
        : 'All QuickBooks projects are already synced.',
    })
  } catch (err: any) {
    console.error('QBO sync error:', err)

    // If token refresh failed, the connection is likely stale
    if (err.message?.includes('Token refresh failed')) {
      return NextResponse.json(
        { error: 'QuickBooks connection expired. Please reconnect QuickBooks.' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: `Sync failed: ${err.message}` },
      { status: 500 }
    )
  }
}
