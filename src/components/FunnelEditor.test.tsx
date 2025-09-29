import { render, screen, fireEvent } from "@testing-library/react";
import FunnelEditor from "./FunnelEditor";

test("漏斗数据保存测试", () => {
  const mockSave = jest.fn();
  render(<FunnelEditor onSave={mockSave} />);

  const input = screen.getByPlaceholderText("输入漏斗数据");
  const saveButton = screen.getByText("保存");

  fireEvent.click(saveButton);
  expect(mockSave).not.toHaveBeenCalled();
  expect(screen.queryByTestId("saved-msg")).toBeNull();

  fireEvent.change(input, { target: { value: "漏斗1" } });
  fireEvent.click(saveButton);

  expect(mockSave).toHaveBeenCalledWith("漏斗1");
  expect(screen.getByTestId("saved-msg")).toBeInTheDocument();
});
