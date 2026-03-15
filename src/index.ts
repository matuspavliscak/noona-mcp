import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SERVER_CONFIG } from "./config.js";
import { getCompanyInfoTool } from "./tools/get-company-info.js";
import { getAvailabilityTool } from "./tools/get-availability.js";
import { listEmployeesTool } from "./tools/list-employees.js";
import { listServicesTool } from "./tools/list-services.js";
import { bookAppointmentTool } from "./tools/book-appointment.js";
import { cancelBookingTool } from "./tools/cancel-booking.js";

const server = new McpServer(SERVER_CONFIG);

const tools = [
  getCompanyInfoTool,
  getAvailabilityTool,
  listEmployeesTool,
  listServicesTool,
  bookAppointmentTool,
  cancelBookingTool,
];

for (const tool of tools) {
  server.tool(tool.name, tool.description, tool.parameters, tool.handler);
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
