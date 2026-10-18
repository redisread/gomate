import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/starwind-react/button";
import { Input } from "@/components/starwind-react/input";
import { Label } from "@/components/starwind-react/label";
import { Textarea } from "@/components/starwind-react/textarea";
import { NativeSelect } from "@/components/starwind-react/native-select";

describe("Starwind native form contracts", () => {
  it("preserves controlled values, label association, and form serialization", () => {
    const submit = vi.fn();
    function Form() {
      const [name, setName] = useState("");
      return (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit(Object.fromEntries(new FormData(event.currentTarget)));
          }}
        >
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
          />
          <Textarea aria-label="Notes" name="notes" defaultValue="Initial" />
          <NativeSelect aria-label="City" name="city" defaultValue="a">
            <option value="a">A</option>
            <option value="b">B</option>
          </NativeSelect>
          <Button type="submit">Save</Button>
        </form>
      );
    }
    render(<Form />);
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Member" },
    });
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "b" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(submit).toHaveBeenCalledWith({
      name: "Member",
      notes: "Initial",
      city: "b",
    });
  });

  it("does not invoke a disabled action", () => {
    const click = vi.fn();
    render(
      <Button disabled onClick={click}>
        Save
      </Button>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(click).not.toHaveBeenCalled();
  });
});
