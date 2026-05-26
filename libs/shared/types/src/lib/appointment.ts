export interface AppointmentSummary {
  id: string;
  customerName: string;
  startsAt: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}
