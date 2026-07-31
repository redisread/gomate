export async function dryRunPreview(
  input: { action: 'create_team' | 'join_team' | 'create_location' | 'publish_story'; parameters: Record<string, unknown> }
) {
  // Validate parameters against known schemas (dry run = pure validation, no API call)
  const validation = validateParameters(input.action, input.parameters);
  if (!validation.valid) {
    return {
      action: input.action,
      wouldExecute: false,
      preview: {},
      errors: validation.errors,
    };
  }

  // Return a "dry run" preview — actual API call not made
  return {
    action: input.action,
    wouldExecute: true,
    preview: {
      ...input.parameters,
      _note: 'Dry run — no actual write performed. Call the corresponding write tool to execute.',
    },
  };
}

function validateParameters(action: string, params: Record<string, unknown>): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];

  switch (action) {
    case 'create_team': {
      if (!params.name || typeof params.name !== 'string') errors.push('name: required string');
      if (!params.locationId || typeof params.locationId !== 'string') errors.push('locationId: required string');
      if (!params.scheduledDate || typeof params.scheduledDate !== 'string') errors.push('scheduledDate: required string');
      break;
    }
    case 'join_team': {
      if (!params.teamId || typeof params.teamId !== 'string') errors.push('teamId: required string');
      break;
    }
    case 'create_location': {
      if (!params.name || typeof params.name !== 'string') errors.push('name: required string');
      if (!params.cityId || typeof params.cityId !== 'string') errors.push('cityId: required string');
      if (typeof params.latitude !== 'number') errors.push('latitude: required number');
      if (typeof params.longitude !== 'number') errors.push('longitude: required number');
      if (!params.difficulty || !['easy', 'moderate', 'hard'].includes(params.difficulty as string)) {
        errors.push('difficulty: required one of easy/moderate/hard');
      }
      break;
    }
    case 'publish_story': {
      if (!params.teamId || typeof params.teamId !== 'string') errors.push('teamId: required string');
      if (!params.content || typeof params.content !== 'string') errors.push('content: required string');
      break;
    }
    default:
      errors.push(`Unknown action: ${action}`);
  }

  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}
