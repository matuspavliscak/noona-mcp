import { z } from "zod";
import { getCompany, getEventTypes } from "../noona-api.js";

export const listServicesTool = {
  name: "list-services",
  description: "List available services (event types) at a Noona company.",
  parameters: {
    companySlug: z
      .string()
      .describe("Company slug on Noona (e.g. buddybarbershopdejvice)"),
  },
  handler: async ({ companySlug }: { companySlug: string }) => {
    const company = await getCompany(companySlug);
    const eventTypes = await getEventTypes(company.id);

    const text = eventTypes
      .map((e) => {
        const price =
          e.price != null ? ` — ${e.price} ${e.currency || ""}` : "";
        return `- ${e.title} (${e.minutes} min${price})`;
      })
      .join("\n");

    return {
      content: [
        {
          type: "text" as const,
          text: `Services at ${company.name}:\n${text}`,
        },
      ],
    };
  },
};
