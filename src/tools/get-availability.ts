import { z } from "zod";
import { getCompany } from "../noona-api.js";
import { fetchTimeslots } from "../timeslots.js";
import { resolveEmployee, resolveService } from "../resolve.js";

/** Format a Date as YYYY-MM-DD in local time. */
export function getLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

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
      .describe(
        "Service name to check availability for (e.g. Classic Haircut)"
      ),
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
      const result = await resolveEmployee(company.id, employeeName);
      if (!result.ok) return result.response;
      employee = result.value;
    }

    // 3. Resolve service
    const serviceResult = await resolveService(company.id, serviceName);
    if (!serviceResult.ok) return serviceResult.response;
    const service = serviceResult.value;

    // 4. Fetch timeslots — use local date to avoid UTC date-boundary issues
    const now = new Date();
    const startDate = getLocalDateString(now);
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() + days);
    const endDate = getLocalDateString(cutoff);

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
