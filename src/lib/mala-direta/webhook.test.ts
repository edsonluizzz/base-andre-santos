import { describe, it, expect } from "vitest";
import { suppressionFromEvent } from "./webhook";

const base = { email_id: "e1", to: ["A@B.com"] };

describe("suppressionFromEvent", () => {
  it("reclamação de spam suprime", () => {
    expect(suppressionFromEvent({ type: "email.complained", data: base })).toEqual({
      emails: ["a@b.com"], reason: "COMPLAINT", emailId: "e1",
    });
  });
  it("bounce permanente suprime", () => {
    expect(
      suppressionFromEvent({ type: "email.bounced", data: { ...base, bounce: { type: "Permanent" } } }),
    ).toEqual({ emails: ["a@b.com"], reason: "BOUNCE", emailId: "e1" });
  });
  it("bounce transitório e outros eventos não suprimem", () => {
    expect(
      suppressionFromEvent({ type: "email.bounced", data: { ...base, bounce: { type: "Transient" } } }),
    ).toBeNull();
    expect(suppressionFromEvent({ type: "email.delivered", data: base })).toBeNull();
  });
});
