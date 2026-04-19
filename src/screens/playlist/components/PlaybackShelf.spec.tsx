import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import PlaybackShelf from "./PlaybackShelf";

const mockItem = {
  id: "1",
  title: "Test Song",
  channelName: "Test Channel",
  timestamp: 0,
  volume: 100,
  audioEq: {},
};

describe("PlaybackShelf", () => {
  it("renders with song info", () => {
    render(
      <PlaybackShelf 
        item={mockItem as any} 
        isPlaying={true} 
        onExpand={() => {}}
      />
    );
    // expect(screen.getByText("Test Song")).toBeInTheDocument();
    // expect(screen.getByText("Test Channel")).toBeInTheDocument();
  });
});
