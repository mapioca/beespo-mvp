export function formatSpeakerStatus(isConfirmed: boolean): string {
  return isConfirmed ? 'Confirmed' : 'Pending';
}

export function getSpeakerStatusVariant(isConfirmed: boolean): 'default' | 'secondary' {
  return isConfirmed ? 'default' : 'secondary';
}
