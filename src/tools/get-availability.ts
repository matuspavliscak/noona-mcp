import { z } from "zod";
import { getCompany, getEmployees, getEventTypes } from "../noona-api.js";
import { fetchTimeslots } from "../timeslots.js";

export const getAvailabilityTool = {
  name: "get-availability",
  description:
    "Get available appointment timeslots at a Noona company. Employee is optional — omit to see all employees' availability.",
  parameters: {
    companySlug: z
      .string()
      .describe("Company slug on Noona (e.g. buddybarbershopdejvice)"),
    serviceName: z
      .string()
      .describe("Service name to check availability for (e.g. Classic Haircut)"),
    employeeName: z
      .string()
      .optional()
      .describe("Employee name (optional — omit to check all employees)"),
    days: z
      .number()
      .default(7)
      .describe("Number of days ahead to check (default: 7)"),
  },
  handler: async ({
    companySlug,
    serviceName,
    employeeName,
    days,
  }: {
    companySlug: string;
    serviceName: string;
    employeeName?: string;
    days: number;
  }) => {
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
              text: `Employee "${employeeName}" not found. Available employees: ${names}`,
            },
          ],
          isError: true,
        };
      }
    }

    // 3. Resolve service (case-insensitive, also try partial match)
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
            text: `Service "${serviceName}" not found. Available services: ${names}`,
          },
        ],
        isError: true,
      };
    }

    // 4. Fetch timeslots via official API
    const now = new Date();
    const startDate = now.toISOString().split("T")[0];
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() + days);
    const endDate = cutoff.toISOString().split("T")[0];

    const timeslots = await fetchTimeslots(
      company.id,
      [service.id],
      startDate,
      endDate,
      employee?.id
    );

    // 5. Format output
    if (timeslots.length === 0) {
      const who = employee ? employee.name : "any employee";
      return {
        content: [
          {
            type: "text" as const,
            text: `No available timeslots for ${who} (${service.title}) in the next ${days} days.`,
          },
        ],
      };
    }

    const lines = timeslots
      .map((ts) => {
        const slots = employee
          ? ts.slots.filter(
              (s) => !s.employeeIds || s.employeeIds.includes(employee!.id)
            )
          : ts.slots;
        if (slots.length === 0) return null;
        const times = slots.map((s) => s.time).join(", ");
        return `${ts.date}: ${times}`;
      })
      .filter(Boolean);

    if (lines.length === 0) {
      const who = employee ? employee.name : "any employee";
      return {
        content: [
          {
            type: "text" as const,
            text: `No available timeslots for ${who} (${service.title}) in the next ${days} days.`,
          },
        ],
      };
    }

    const who = employee ? employee.name : "any employee";
    const header = `Available timeslots for ${who} — ${service.title} (${service.minutes} min) at ${company.name}:`;
    const text = `${header}\n\n${lines.join("\n")}`;

    return {
      content: [{ type: "text" as const, text }],
    };
  },
};
