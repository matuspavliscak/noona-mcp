import { z } from "zod";
import { getCompany, getEnterprise } from "../noona-api.js";

/**
 * Parses a Noona URL or slug into a clean slug.
 * Handles: "https://noona.app/cs/myshop", "noona.app/myshop", "myshop"
 */
function parseSlug(input: string): string {
  let slug = input.trim();

  // Strip protocol and domain
  slug = slug.replace(/^https?:\/\//, "");
  slug = slug.replace(/^(www\.)?noona\.app\//, "");

  // Strip locale prefix (e.g. "cs/", "en/")
  slug = slug.replace(/^[a-z]{2}\//, "");

  // Strip trailing slashes and query params
  slug = slug.replace(/[/?#].*$/, "");

  return slug;
}

export const getCompanyInfoTool = {
  name: "get-company-info",
  description:
    "Get information about a Noona company or brand. Accepts a Noona URL or slug. If the slug is a brand/enterprise with multiple locations, returns all locations.",
  parameters: {
    company: z
      .string()
      .describe(
        'Noona URL or company slug (e.g. "https://noona.app/cs/myshop" or "myshop")'
      ),
  },
  handler: async ({ company: input }: { company: string }) => {
    const slug = parseSlug(input);

    // Try as a single company first
    try {
      const company = await getCompany(slug);
      const lines = [
        `Company: ${company.name}`,
        `Slug: ${company.slug}`,
        `ID: ${company.id}`,
      ];
      if (company.address) lines.push(`Address: ${company.address}`);
      if (company.timezone) lines.push(`Timezone: ${company.timezone}`);
      if (company.enterprise_id)
        lines.push(`Enterprise ID: ${company.enterprise_id}`);

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    } catch {
      // Not a company slug — try as enterprise
    }

    // Try as enterprise (brand with multiple locations)
    try {
      const enterprise = await getEnterprise(slug);
      const header = `Brand: ${enterprise.name} (${enterprise.companies.length} locations)\n`;
      const locations = enterprise.companies
        .map((c) => {
          const parts = [`- ${c.name} (slug: ${c.slug})`];
          if (c.address) parts.push(`  Address: ${c.address}`);
          return parts.join("\n");
        })
        .join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `${header}\n${locations}`,
          },
        ],
      };
    } catch {
      // Not found as either
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Could not find a company or brand with slug "${slug}". Check the URL and try again.`,
        },
      ],
      isError: true,
    };
  },
};
