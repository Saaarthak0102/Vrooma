/**
 * Chatbot tool definition stubs for Vercel AI SDK integration in Phase 5.
 */

export interface ChatVehicleTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export const chatTools: ChatVehicleTool[] = [
  {
    name: "searchCars",
    description: "Search active new models and certified pre-owned cars by fuel, budget and body type.",
    parameters: {
      type: "object",
      properties: {
        budget: { type: "number", description: "Maximum budget in rupees" },
        fuel: { type: "string", enum: ["petrol", "diesel", "cng", "ev"] },
      },
    },
  },
  {
    name: "calculateEmi",
    description: "Calculate monthly EMI and total interest for a car loan.",
    parameters: {
      type: "object",
      properties: {
        principal: { type: "number" },
        tenureMonths: { type: "number" },
        annualRate: { type: "number" },
      },
      required: ["principal", "tenureMonths"],
    },
  },
];
