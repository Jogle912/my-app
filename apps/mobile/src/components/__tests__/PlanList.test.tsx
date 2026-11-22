import { demoStudent, fixedClock, plan } from "@studypilot/scheduler";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { PlanList } from "../PlanList";

const now = new Date("2026-11-23T14:00:00Z");

describe("PlanList", () => {
  it("shows capacity, sessions by day, and opens the tapped assignment", async () => {
    const input = demoStudent(now);
    const result = plan(input, fixedClock(now.toISOString()));
    const names = Object.fromEntries(input.courses.map((c) => [c.id, c.name]));
    const onOpen = jest.fn();
    await render(<PlanList result={result} timeZone={input.timeZone} courseNames={names} onOpenItem={onOpen} now={now} />);

    expect(screen.getByText("To do")).toBeTruthy();
    expect(screen.getByText("Today")).toBeTruthy();
    const first = result.sessions[0];
    const card = screen.getAllByLabelText(new RegExp(`^${first.title}`))[0];
    await fireEvent.press(card);
    expect(onOpen).toHaveBeenCalledWith(first.itemId);
  });

  it("states shortfalls honestly when there is not enough time", async () => {
    const input = { ...demoStudent(now), availability: [] };
    const result = plan(input, fixedClock(now.toISOString()));
    await render(<PlanList result={result} timeZone={input.timeZone} courseNames={{}} now={now} />);
    expect(screen.getAllByText(/Not enough free time/).length).toBe(result.shortfalls.length);
    expect(screen.getByText("Nothing to schedule right now.")).toBeTruthy();
  });
});
