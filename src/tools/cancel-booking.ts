import { z } from "zod";
import { cancelBooking } from "../noona-api.js";

export const cancelBookingTool = {
  name: "cancel-booking",
  description:
    "Cancel an existing booking by its booking ID.",
  parameters: {
    bookingId: z
      .string()
      .describe("The booking ID to cancel"),
    reason: z
      .string()
      .default("")
      .describe("Optional cancellation reason"),
  },
  handler: async ({
    bookingId,
    reason,
  }: {
    bookingId: string;
    reason: string;
  }) => {
    try {
      await cancelBooking(bookingId, reason);
      return {
        content: [
          {
            type: "text" as const,
            text: `Booking ${bookingId} has been cancelled.`,
          },
        ],
      };
    } catch (error: any) {
      const message =
        error.response?.data?.message || error.message || String(error);
      return {
        content: [
          {
            type: "text" as const,
            text: `Cancellation failed: ${message}`,
          },
        ],
        isError: true,
      };
    }
  },
};
