// services/notifications.ts
export async function sendBookingConfirmationEmail({ to, recruiterId, start, end, bookingId, joinLink }: any) {
  if (!to) return;
  // TODO: replace with your email provider (nodemailer / SendGrid)
  console.log("sendBookingConfirmationEmail", { to, recruiterId, start, end, bookingId, joinLink });
  return true;
}

export async function sendCancellationEmail({ bookingId, recruiterId, candidateId }: any) {
  console.log("sendCancellationEmail", { bookingId, recruiterId, candidateId });
  return true;
}
