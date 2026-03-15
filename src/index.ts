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

server.tool(getCompanyInfoTool.name, getCompanyInfoTool.description, getCompanyInfoTool.parameters, getCompanyInfoTool.handler);
server.tool(getAvailabilityTool.name, getAvailabilityTool.description, getAvailabilityTool.parameters, getAvailabilityTool.handler);
server.tool(listEmployeesTool.name, listEmployeesTool.description, listEmployeesTool.parameters, listEmployeesTool.handler);
server.tool(listServicesTool.name, listServicesTool.description, listServicesTool.parameters, listServicesTool.handler);
server.tool(bookAppointmentTool.name, bookAppointmentTool.description, bookAppointmentTool.parameters, bookAppointmentTool.handler);
server.tool(cancelBookingTool.name, cancelBookingTool.description, cancelBookingTool.parameters, cancelBookingTool.handler);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Server failed to start:", err);
  process.exit(1);
});
