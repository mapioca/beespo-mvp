'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { DirectoryTag } from '@/types/database'

export async function getDirectoryTags() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from('profiles') as any)
    .select('workspace_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return { data: null, error: 'Profile not found' }
  }

  const { data, error } = await supabase
    .from('directory_tags')
    .select('*')
    .eq('workspace_id', profile.workspace_id)
    .order('name')

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as DirectoryTag[], error: null }
}

export async function createDirectoryTag(payload: { name: string; color: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from('profiles') as any)
    .select('workspace_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return { data: null, error: 'Profile not found' }
  }

  if (!['admin', 'leader'].includes(profile.role)) {
    return { data: null, error: 'Insufficient permissions' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('directory_tags')
    .insert({
      workspace_id: profile.workspace_id,
      name: payload.name,
      color: payload.color,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  revalidatePath('/meetings/directory')
  revalidatePath('/participants')

  return { data: data as DirectoryTag, error: null }
}

export async function deleteDirectoryTag(tagId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from('profiles') as any)
    .select('workspace_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return { error: 'Profile not found' }
  }

  if (!['admin', 'leader'].includes(profile.role)) {
    return { error: 'Insufficient permissions' }
  }

  // Verify tag belongs to user's workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tag } = await (supabase as any)
    .from('directory_tags')
    .select('id')
    .eq('id', tagId)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (!tag) {
    return { error: 'Tag not found or access denied' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('directory_tags')
    .delete()
    .eq('id', tagId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/meetings/directory')
  revalidatePath('/participants')

  return { error: null }
}

export async function assignTagToDirectoryEntry(directoryId: string, tagId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from('profiles') as any)
    .select('workspace_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return { error: 'Profile not found' }
  }

  if (!['admin', 'leader'].includes(profile.role)) {
    return { error: 'Insufficient permissions' }
  }

  // Verify tag and directory entry belong to user's workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tag } = await (supabase as any)
    .from('directory_tags')
    .select('id')
    .eq('id', tagId)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (!tag) {
    return { error: 'Tag not found or access denied' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: dir } = await (supabase as any)
    .from('directory')
    .select('id')
    .eq('id', directoryId)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (!dir) {
    return { error: 'Directory entry not found or access denied' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('directory_tag_assignments')
    .insert({
      directory_id: directoryId,
      tag_id: tagId,
    })

  // Ignore unique constraint violation (already assigned)
  if (error && error.code !== '23505') {
    return { error: error.message }
  }

  revalidatePath('/meetings/directory')
  revalidatePath('/participants')

  return { error: null }
}

export async function removeTagFromDirectoryEntry(directoryId: string, tagId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from('profiles') as any)
    .select('workspace_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return { error: 'Profile not found' }
  }

  if (!['admin', 'leader'].includes(profile.role)) {
    return { error: 'Insufficient permissions' }
  }

  // Verify tag belongs to user's workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tag } = await (supabase as any)
    .from('directory_tags')
    .select('id')
    .eq('id', tagId)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (!tag) {
    return { error: 'Tag not found or access denied' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('directory_tag_assignments')
    .delete()
    .eq('directory_id', directoryId)
    .eq('tag_id', tagId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/meetings/directory')
  revalidatePath('/participants')

  return { error: null }
}

export async function updateDirectoryTag(tagId: string, payload: { name: string; color: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from('profiles') as any)
    .select('workspace_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return { data: null, error: 'Profile not found' }
  }

  if (!['admin', 'leader'].includes(profile.role)) {
    return { data: null, error: 'Insufficient permissions' }
  }

  // Verify tag belongs to user's workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tag } = await (supabase as any)
    .from('directory_tags')
    .select('id')
    .eq('id', tagId)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (!tag) {
    return { data: null, error: 'Tag not found or access denied' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('directory_tags')
    .update({
      name: payload.name,
      color: payload.color,
    })
    .eq('id', tagId)
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  revalidatePath('/meetings/directory')
  revalidatePath('/participants')

  return { data: data as DirectoryTag, error: null }
}
