import { z } from "zod";
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import {
  getCompany,
  createReservation,
  confirmBooking,
} from "../noona-api.js";
import { fetchTimeslots } from "../timeslots.js";
import { resolveEmployee, resolveService, formatError } from "../resolve.js";

interface CustomerConfig {
  customerName?: string;
  customerPhone?: string;
  phoneCountryCode?: string;
  customerEmail?: string;
}

function loadCustomerConfig(): CustomerConfig {
  const configPath = join(homedir(), ".noona", "config.json");
  try {
    return JSON.parse(readFileSync(configPath, "utf-8"));
  } catch (error: unknown) {
    const isNotFound =
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT";
    if (!isNotFound) {
      console.error(
        `Warning: failed to read ${configPath}:`,
        error instanceof Error ? error.message : error
      );
    }
    return {};
  }
}

/**
 * Get the UTC offset string (e.g. "+01:00") for a given IANA timezone
 * at a specific local date/time.
 */
export function getUtcOffset(
  timezone: string,
  date: string,
  time: string
): string {
  const dt = new Date(`${date}T${time}:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "longOffset",
  }).formatToParts(dt);
  const offsetPart = parts.find((p) => p.type === "timeZoneName");
  // longOffset gives "GMT+01:00" or "GMT" for UTC
  const raw = offsetPart?.value || "GMT";
  return raw === "GMT" ? "+00:00" : raw.replace("GMT", "");
}

/**
 * Build ISO 8601 datetime with the correct UTC offset for the shop's timezone.
 * Timeslots from the API are in the shop's local time, so we must send them
 * back with the matching offset (e.g. +01:00 for CET, +02:00 for CEST).
 */
export function buildStartsAt(
  date: string,
  time: string,
  timezone?: string
): string {
  const naive = `${date}T${time}:00.000`;
  if (!timezone) return `${naive}+00:00`;
  try {
    const offset = getUtcOffset(timezone, date, time);
    return `${naive}${offset}`;
  } catch {
    console.error(
      `Warning: unknown timezone "${timezone}", falling back to UTC`
    );
    return `${naive}+00:00`;
  }
}

export const bookAppointmentTool = {
  name: "book-appointment",
  description:
    "Book an appointment at a Noona company. Creates a reservation and confirms it. Employee is optional. Customer contact fields are optional if ~/.noona/config.json exists.",
  parameters: {
    companySlug: z
      .string()
      .describe("Company slug on Noona (e.g. buddybarbershopdejvice)"),
    serviceName: z.string().describe("Service name (e.g. Classic Haircut)"),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD format")
      .describe("Date in YYYY-MM-DD format (e.g. 2026-03-21)"),
    time: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Expected HH:MM format")
      .describe("Time in HH:MM format (e.g. 14:00)"),
    customerName: z
      .string()
      .optional()
      .describe(
        "Customer full name (optional — falls back to ~/.noona/config.json)"
      ),
    customerPhone: z
      .string()
      .optional()
      .describe(
        "Customer phone number without country code (optional — falls back to ~/.noona/config.json)"
      ),
    phoneCountryCode: z
      .string()
      .optional()
      .describe(
        "Phone country code without + (optional — falls back to ~/.noona/config.json, then 420)"
      ),
    customerEmail: z
      .string()
      .optional()
      .describe(
        "Customer email address (optional — falls back to ~/.noona/config.json)"
      ),
    employeeName: z
      .string()
      .optional()
      .describe("Employee name (optional — omit to let the system pick)"),
  },
  handler: async ({
    companySlug,
    serviceName,
    date,
    time,
    customerName,
    customerPhone,
    phoneCountryCode,
    customerEmail,
    employeeName,
  }: {
    companySlug: string;
    serviceName: string;
    date: string;
    time: string;
    customerName?: string;
    customerPhone?: string;
    phoneCountryCode?: string;
    customerEmail?: string;
    employeeName?: string;
  }) => {
    try {
      // Load customer defaults from config file
      const config = loadCustomerConfig();
      const name = customerName || config.customerName;
      const phone = customerPhone || config.customerPhone;
      const countryCode = phoneCountryCode || config.phoneCountryCode || "420";
      const email = customerEmail || config.customerEmail;

      if (!name || !phone || !email) {
        const missing = [
          !name && "customerName",
          !phone && "customerPhone",
          !email && "customerEmail",
        ].filter(Boolean);
        return {
          content: [
            {
              type: "text" as const,
              text: `Missing required contact info: ${missing.join(", ")}. Either pass them as parameters or create ~/.noona/config.json with these fields.`,
            },
          ],
          isError: true,
        };
      }

      // 1. Resolve company
      const company = await getCompany(companySlug);

      // 2. Resolve employee (optional)
      let employee: { id: string; name: string } | undefined;
      if (employeeName) {
        const result = await resolveEmployee(company.id, employeeName);
        if (!result.ok) return result.response;
        employee = result.value;
      }

      // 3. Resolve service
      const serviceResult = await resolveService(company.id, serviceName);
      if (!serviceResult.ok) return serviceResult.response;
      const service = serviceResult.value;

      // 4. Verify slot is available
      const timeslots = await fetchTimeslots(
        company.id,
        [service.id],
        date,
        date,
        employee?.id
      );
      const daySlots = timeslots.find((ts) => ts.date === date);
      if (!daySlots) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No available slots on ${date}.`,
            },
          ],
          isError: true,
        };
      }
      const matchingSlot = daySlots.slots.find(
        (s) =>
          s.time === time &&
          (!employee ||
            !s.employeeIds ||
            s.employeeIds.includes(employee.id))
      );
      if (!matchingSlot) {
        const available = daySlots.slots
          .filter(
            (s) =>
              !employee ||
              !s.employeeIds ||
              s.employeeIds.includes(employee.id)
          )
          .map((s) => s.time)
          .join(", ");
        return {
          content: [
            {
              type: "text" as const,
              text: `Time ${time} is not available on ${date}. Available times: ${available}`,
            },
          ],
          isError: true,
        };
      }

      // 5. Create reservation — API requires ISO 8601 with timezone offset
      const startsAt = buildStartsAt(date, time, company.timezone);
      const reservation = await createReservation(
        company.id,
        [service.id],
        startsAt,
        employee?.id
      );

      // 6. Confirm booking
      const booking = await confirmBooking(
        reservation.id,
        name,
        countryCode,
        phone,
        email
      );

      const text = [
        `Booking confirmed!`,
        ``,
        `Booking ID: ${booking.id}`,
        `Service: ${booking.service_title || service.title}`,
        `Employee: ${booking.employee_name || employee?.name || "assigned by shop"}`,
        `Date/Time: ${date} at ${time}`,
        `Location: ${booking.company_name || company.name}`,
        `Customer: ${name} (${email})`,
        `Status: ${booking.status}`,
      ].join("\n");

      return {
        content: [{ type: "text" as const, text }],
      };
    } catch (error: unknown) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Booking failed: ${formatError(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
};
