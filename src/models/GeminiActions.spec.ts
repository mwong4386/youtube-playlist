import test from "node:test";
import MsgType from "../constants/msgType";
import type { AgenticChatRequest, AgenticChatResponse, AgenticChatMessage } from "./GeminiActions";

test("MsgType.AgenticChatRequest is defined", () => {
  if (MsgType.AgenticChatRequest === undefined) {
    throw new Error("MsgType.AgenticChatRequest is undefined");
  }
});

test("Agentic types can be instantiated (type check)", () => {
  const message: AgenticChatMessage = {
    role: "USER",
    content: "hello"
  };

  const request: AgenticChatRequest = {
    history: [message],
    userRequest: "how are you?"
  };

  const response: AgenticChatResponse = {
    ok: true,
    message: "I am fine",
    history: [message, { role: "MODEL", content: "I am fine" }]
  };

  if (!request.userRequest || !response.ok) {
    throw new Error("Type instantiation failed");
  }
});
