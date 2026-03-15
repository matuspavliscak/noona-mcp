import axios from "axios";
import { NOONA_API_BASE } from "./config.js";

export const api = axios.create({
  baseURL: NOONA_API_BASE,
  paramsSerializer: (params) => {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        for (const v of value) {
          parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
        }
      } else if (value != null) {
        parts.push(
          `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
        );
      }
    }
    return parts.join("&");
  },
});

// Simple in-memory cache for the session
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data as T;
  return null;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, ts: Date.now() });
}

// --- Interfaces ---

export interface Company {
  id: string;
  slug: string;
  name: string;
  address?: string;
  timezone?: string;
  enterprise_id?: string;
}

export interface Enterprise {
  id: string;
  name: string;
  slug: string;
  companies: Company[];
}

export interface Employee {
  id: string;
  name: string;
  image?: string;
}

export interface EventType {
  id: string;
  title: string;
  minutes: number;
  price?: number;
  currency?: string;
}

export interface Reservation {
  id: string;
  starts_at: string;
  ends_at: string;
  expires_at: string;
}

export interface Booking {
  id: string;
  status: string;
  starts_at: string;
  employee_name?: string;
  service_title?: string;
  company_name?: string;
}

// --- Company & Enterprise ---

export async function getCompany(slug: string): Promise<Company> {
  const cacheKey = `company:${slug}`;
  const cached = getCached<Company>(cacheKey);
  if (cached) return cached;

  const { data } = await api.get(`/companies/${slug}`);
  const company: Company = {
    id: data.id || data._id,
    slug: data.connections?.url_name || slug,
    name: data.profile?.store_name || slug,
    address: data.connections?.location?.formatted_address,
    timezone: data.connections?.location?.time_zone,
    enterprise_id: data.enterprise_id || data.enterprise,
  };
  setCache(cacheKey, company);
  return company;
}

export async function getEnterprise(slug: string): Promise<Enterprise> {
  const cacheKey = `enterprise:${slug}`;
  const cached = getCached<Enterprise>(cacheKey);
  if (cached) return cached;

  const { data } = await api.get(`/enterprises/${slug}`);
  const companies: Company[] = (data.companies || []).map((c: any) => ({
    id: c.id || c._id,
    slug: c.connections?.url_name || "",
    name: c.profile?.store_name || "",
    address: c.connections?.location?.formatted_address,
    timezone: c.connections?.location?.time_zone,
    enterprise_id: data.id || data._id,
  }));
  const enterprise: Enterprise = {
    id: data.id || data._id,
    name: data.profile?.name || slug,
    slug: data.connections?.url_name || slug,
    companies,
  };
  setCache(cacheKey, enterprise);
  return enterprise;
}

// --- Employees & Services ---

export async function getEmployees(companyId: string): Promise<Employee[]> {
  const cacheKey = `employees:${companyId}`;
  const cached = getCached<Employee[]>(cacheKey);
  if (cached) return cached;

  const { data } = await api.get(`/companies/${companyId}/employees`);
  const employees: Employee[] = (data.data || data).map((e: any) => ({
    id: e.id || e._id,
    name: e.profile?.name || e.nickname || e.name || "Unknown",
    image: e.profile?.image?.thumb,
  }));
  setCache(cacheKey, employees);
  return employees;
}

export async function getEventTypes(companyId: string): Promise<EventType[]> {
  const cacheKey = `eventTypes:${companyId}`;
  const cached = getCached<EventType[]>(cacheKey);
  if (cached) return cached;

  const { data } = await api.get(`/companies/${companyId}/event_types`);
  const eventTypes: EventType[] = (data.data || data).map((e: any) => ({
    id: e.id || e._id,
    title: e.title,
    minutes: e.minutes,
    price:
      e.payments?.total_payment ?? e.variations?.[0]?.prices?.[0]?.amount,
    currency:
      e.payments?.pre_payment_currency ??
      e.variations?.[0]?.prices?.[0]?.currency ??
      "CZK",
  }));
  setCache(cacheKey, eventTypes);
  return eventTypes;
}

// --- Booking ---

export async function createReservation(
  companyId: string,
  eventTypeIds: string[],
  startsAt: string,
  employeeId?: string
): Promise<Reservation> {
  const body: {
    company: string;
    event_types: string[];
    starts_at: string;
    employee?: string;
  } = {
    company: companyId,
    event_types: eventTypeIds,
    starts_at: startsAt,
  };
  if (employeeId) {
    body.employee = employeeId;
  }

  const { data } = await api.post("/time_slot_reservations", body, {
    params: {
      "expand[]": ["company", "event_types", "employee", "space"],
    },
  });
  return {
    id: data.id || data._id,
    starts_at: data.starts_at,
    ends_at: data.ends_at,
    expires_at: data.expires_at,
  };
}

export async function confirmBooking(
  reservationId: string,
  customerName: string,
  phoneCountryCode: string,
  phoneNumber: string,
  email: string
): Promise<Booking> {
  const { data } = await api.post(
    "/events",
    {
      time_slot_reservation: reservationId,
      phone_country_code: phoneCountryCode,
      phone_number: phoneNumber,
      customer_name: customerName,
      email: email,
      origin: "online",
      no_show_acknowledged: true,
      booking_for_other: false,
      booking_questions: [],
    },
    {
      params: {
        "expand[]": ["company", "employee", "space", "event_type", "payment"],
      },
    }
  );
  return {
    id: data.id || data._id,
    status: data.status,
    starts_at: data.starts_at,
    employee_name: data.employee?.profile?.name,
    service_title: data.event_type?.title,
    company_name: data.company?.profile?.store_name,
  };
}

export async function cancelBooking(
  bookingId: string,
  reason: string = ""
): Promise<void> {
  await api.post(`/events/${bookingId}`, {
    status: "cancelled",
    cancel_reason: reason,
  });
}
