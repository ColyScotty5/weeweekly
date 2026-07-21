export function reportError(context, error) {
  if (import.meta.env.DEV) {
    console.error(context, error)
  }
}

export function userFacingError(action) {
  return `Unable to ${action}. Please try again.`
}
