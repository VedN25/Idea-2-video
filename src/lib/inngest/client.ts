import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "idea2video",
  name: "Idea2Video AI",
  credentials: {
    gemini: process.env.GEMINI_API_KEY,
    openai: process.env.OPENAI_API_KEY,
  },
  eventKey: process.env.INNGEST_EVENT_KEY,
  signingKey: process.env.INNGEST_SIGNING_KEY,
});