#! /usr/bin/env bun

import readline from "readline/promises";
import { stdin as input, stdout as output } from "node:process";
import OpenAI from "openai";
import type { ResponseInput } from "openai/resources/responses/responses";
import ora from "ora";

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

const rl = readline.createInterface({ input, output, prompt: "› " });

rl.prompt();

for await (const line of rl) {
	if (line == null) break;

	messages.push({ role: "user", content: line });

	// Allow for conversation saving (eventually)
	let response = "";

	const spinner = ora("Waiting for OpenAI...").start();

	// TODO: Need to do some error catching for models that don't support reasoning or web search.
	const completion = await openai.responses.create({
		model: "gpt-5-nano",
		temperature: 1,
		stream: true,
		input: messages,
		reasoning: { effort: "low", summary: "detailed" },
		tools: [{ type: "web_search_preview" }],
	});

	for await (const event of completion) {
		switch (event.type) {
			case "response.reasoning_text.delta":
				spinner.text = "Reasoning in detail...";
				break;

			case "response.web_search_call.in_progress":
				spinner.text = "Preparing web search...";
				break;

			case "response.web_search_call.searching":
				spinner.text = "Searching the web...";
				break;

			case "response.reasoning_summary_text.delta":
				spinner.text = "Reasoning...";
				break;

			case "response.output_text.delta": {
				if (spinner.isSpinning) {
					spinner.stop();
				}
				response += event.delta;
				process.stdout.write(event.delta);
				break;
			}
		}
	}

	// Get rid of silly end of line
	console.log("\n");
	rl.prompt();
}

rl.close();
process.exit(0);
