/**
 * Timestamp Utility Functions
 * Centralized timestamp formatting for external services
 */

/**
 * Format timestamp without 'Z' suffix: YYYY-MM-DDThh:mm:SS.sss
 * Required format for DIFE and MOL APIs
 */
export function formatTimestampWithoutZ(): string {
  const now = new Date();
  return now.toISOString().slice(0, -1); // Remove the 'Z' at the end
}

/**
 * Generate 15-digit correlation ID based on current timestamp
 * Converts timestamp to string and pads with leading zeros if needed
 */
export function generateCorrelationId(): string {
  const timestamp = Date.now().toString();
  return timestamp.padStart(15, '0');
}
