#! /usr/bin/env bun

import readline from "readline";
import OpenAI from "openai";
import type { ResponseInput } from "openai/resources/responses/responses";

console.log();

const messages: ResponseInput = [
	{
		role: "system",
		content:
			"You are a helpful assistant that answers questions based on the provided context.",
	},
];

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

// TODO: Move to readline/promises
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
	prompt: "❯ ",
});

rl.prompt();

rl.on("line", async (line) => {
	messages.push({
		role: "user",
		content: line,
	});

	// Allow for saving conversation
	let response = "";

	const completion = await openai.responses.create({
		model: "gpt-5-nano",
		temperature: 1,
		stream: true,
		input: messages,
		tools: [{ type: "web_search_preview" }],
	});

	for await (const event of completion) {
		// TODO: Handle more events, ideally with switch statement
		if (event.type === "response.output_text.delta") {
			response += event.delta;

			process.stdout.write(event.delta);
		}
	}

	// Get rid of silly end of line, and print another
	console.log("\n");
	rl.prompt();
}).on("close", () => {
	process.exit(0);
});
