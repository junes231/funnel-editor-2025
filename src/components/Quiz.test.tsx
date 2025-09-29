import { render, screen, fireEvent } from "@testing-library/react";
import Quiz from "./Quiz";

test("点击次数累加、按钮消失、按钮无反应测试", () => {
  render(<Quiz question="测试题" answers={["A", "B"]} />);

  const buttonA = screen.getByText(/A/);
  const buttonB = screen.getByText(/B/);

  fireEvent.click(buttonA);
  expect(screen.queryByText(/A/)).toBeNull();

  fireEvent.click(buttonA);
  expect(screen.queryByText(/A/)).toBeNull();

  fireEvent.click(buttonB);
  expect(screen.queryByText(/B/)).toBeNull();
});
