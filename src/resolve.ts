import {
  getEmployees,
  getEventTypes,
  type Employee,
  type EventType,
} from "./noona-api.js";

interface ToolError {
  content: [{ type: "text"; text: string }];
  isError: true;
}

type Result<T> = { ok: true; value: T } | { ok: false; response: ToolError };

export async function resolveEmployee(
  companyId: string,
  employeeName: string
): Promise<Result<Employee>> {
  const employees = await getEmployees(companyId);
  const match = employees.find(
    (e) => e.name.toLowerCase() === employeeName.toLowerCase()
  );
  if (!match) {
    const names = employees.map((e) => e.name).join(", ");
    return {
      ok: false,
      response: {
        content: [
          {
            type: "text" as const,
            text: `Employee "${employeeName}" not found. Available: ${names}`,
          },
        ],
        isError: true,
      },
    };
  }
  return { ok: true, value: match };
}

export async function resolveService(
  companyId: string,
  serviceName: string
): Promise<Result<EventType>> {
  const eventTypes = await getEventTypes(companyId);
  const lower = serviceName.toLowerCase();
  const match =
    eventTypes.find((e) => e.title.toLowerCase() === lower) ||
    eventTypes.find((e) => e.title.toLowerCase().includes(lower));
  if (!match) {
    const names = eventTypes.map((e) => e.title).join(", ");
    return {
      ok: false,
      response: {
        content: [
          {
            type: "text" as const,
            text: `Service "${serviceName}" not found. Available: ${names}`,
          },
        ],
        isError: true,
      },
    };
  }
  return { ok: true, value: match };
}

/**
 * Extract a user-friendly error message from an unknown error.
 * Handles Axios errors (with response.data.message) and plain Errors.
 */
export function formatError(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const resp = (error as { response?: { data?: { message?: string } } })
      .response;
    if (resp?.data?.message) return resp.data.message;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}
