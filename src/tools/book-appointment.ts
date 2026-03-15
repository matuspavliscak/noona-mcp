import { z } from "zod";
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import {
  getCompany,
  getEmployees,
  getEventTypes,
  createReservation,
  confirmBooking,
} from "../noona-api.js";
import { fetchTimeslots } from "../timeslots.js";

interface CustomerConfig {
  customerName?: string;
  customerPhone?: string;
  phoneCountryCode?: string;
  customerEmail?: string;
}

function loadCustomerConfig(): CustomerConfig {
  try {
    const configPath = join(homedir(), ".noona", "config.json");
    return JSON.parse(readFileSync(configPath, "utf-8"));
  } catch {
    return {};
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
    date: z.string().describe("Date in YYYY-MM-DD format (e.g. 2026-03-21)"),
    time: z.string().describe("Time in HH:MM format (e.g. 14:00)"),
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
        const employees = await getEmployees(company.id);
        employee = employees.find(
          (e) => e.name.toLowerCase() === employeeName.toLowerCase()
        );
        if (!employee) {
          const names = employees.map((e) => e.name).join(", ");
          return {
            content: [
              {
                type: "text" as const,
                text: `Employee "${employeeName}" not found. Available: ${names}`,
              },
            ],
            isError: true,
          };
        }
      }

      // 3. Resolve service
      const eventTypes = await getEventTypes(company.id);
      const serviceNameLower = serviceName.toLowerCase();
      const service =
        eventTypes.find((e) => e.title.toLowerCase() === serviceNameLower) ||
        eventTypes.find((e) =>
          e.title.toLowerCase().includes(serviceNameLower)
        );
      if (!service) {
        const names = eventTypes.map((e) => e.title).join(", ");
        return {
          content: [
            {
              type: "text" as const,
              text: `Service "${serviceName}" not found. Available: ${names}`,
            },
          ],
          isError: true,
        };
      }

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

      // 5. Create reservation (with timezone offset)
      let startsAt = `${date}T${time}:00`;
      if (company.timezone) {
        const local = new Date(`${date}T${time}:00`);
        const offset = new Intl.DateTimeFormat("en", {
          timeZone: company.timezone,
          timeZoneName: "longOffset",
        })
          .formatToParts(local)
          .find((p) => p.type === "timeZoneName")?.value ?? "";
        // "GMT+01:00" → "+01:00", "GMT" → "+00:00"
        const tz = offset === "GMT" ? "+00:00" : offset.replace("GMT", "");
        startsAt = `${date}T${time}:00${tz}`;
      }
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
    } catch (error: any) {
      const message =
        error.response?.data?.message || error.message || String(error);
      return {
        content: [
          {
            type: "text" as const,
            text: `Booking failed: ${message}`,
          },
        ],
        isError: true,
      };
    }
  },
};
