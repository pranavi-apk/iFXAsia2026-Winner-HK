import { $ } from "./core/dom.js";
import { mountAgent } from "./components/agent.js";

history.replaceState(null, "", "/app");
mountAgent($("#app"));
