import { z } from "zod";
import { getCompany, getEmployees } from "../noona-api.js";

export const listEmployeesTool = {
  name: "list-employees",
  description: "List all employees at a Noona company.",
  parameters: {
    companySlug: z
      .string()
      .describe("Company slug on Noona (e.g. buddybarbershopdejvice)"),
  },
  handler: async ({ companySlug }: { companySlug: string }) => {
    const company = await getCompany(companySlug);
    const employees = await getEmployees(company.id);

    const text = employees
      .map((e) => `- ${e.name} (ID: ${e.id})`)
      .join("\n");

    return {
      content: [
        {
          type: "text" as const,
          text: `Employees at ${company.name}:\n${text}`,
        },
      ],
    };
  },
};
