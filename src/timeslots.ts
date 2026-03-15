import axios from "axios";
import { NOONA_API_BASE } from "./config.js";

export interface Timeslot {
  date: string;
  slots: { time: string; employeeIds?: string[] }[];
  status?: string;
}

/**
 * Fetch available timeslots via the official Noona Marketplace API.
 *
 * @param companyId  - Company ID (not slug)
 * @param eventTypeIds - Array of event type IDs
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate   - End date (YYYY-MM-DD)
 * @param employeeId - Optional employee ID filter
 */
export async function fetchTimeslots(
  companyId: string,
  eventTypeIds: string[],
  startDate: string,
  endDate: string,
  employeeId?: string
): Promise<Timeslot[]> {
  const params: Record<string, any> = {
    start_date: startDate,
    end_date: endDate,
    "event_type_ids[]": eventTypeIds,
  };

  if (employeeId) {
    params.employee_id = employeeId;
  }

  const { data } = await axios.get(
    `${NOONA_API_BASE}/companies/${companyId}/time_slots`,
    { params }
  );

  // The API returns an array of { date, slots, status } objects
  const timeslots: Timeslot[] = (Array.isArray(data) ? data : data.data || [])
    .filter((ts: any) => ts.slots && ts.slots.length > 0);

  return timeslots;
}
