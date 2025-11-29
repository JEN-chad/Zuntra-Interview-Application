// services/token.ts
export function issueInterviewToken({ bookingId, candidateId }: { bookingId: string, candidateId: string }) {
  // Replace with real STT/RTC token generation (e.g., WebRTC/Janus/LiveKit/Assembly)
  // Keep token issuance server-side and short-lived.
  return {
    token: `mock-token-${bookingId}-${Date.now()}`,
    expiresAt: new Date(Date.now() + 1000 * 60 * 15).toISOString(), // 15 minutes
  };
}
