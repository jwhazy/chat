#! /usr/bin/env bun

import OpenAI from "openai";
import type { ResponseInput } from "openai/resources/responses/responses";
import ora from "ora";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

if (!process.env.OPENAI_API_KEY) {
	throw new Error("OPENAI_API_KEY is not set");
}

const argv = await yargs(hideBin(process.argv))
	.option("input", {
		alias: "i",
		type: "string",
		describe: "Initial message to send",
	})
	.option("disable-chat", {
		type: "boolean",
		default: false,
		describe: "Disable chat functionality, will not offer a prompt.",
	})
	.option("model", {
		alias: "m",
		type: "string",
		default: "gpt-5-nano",
		describe: "OpenAI model to use",
	})
	.option("temperature", {
		alias: "t",
		type: "number",
		default: 1,
		describe: "Temperature for response generation",
	})
	.option("reasoning-effort", {
		type: "string",
		default: "low",
		choices: ["low", "medium", "high"],
		describe: "Reasoning effort level",
	})
	.option("reasoning-summary", {
		type: "string",
		default: "detailed",
		choices: ["detailed", "auto", "concise"],
		describe: "Reasoning summary type",
	})
	.option("disable-web-search", {
		type: "boolean",
		default: false,
		describe: "Disable web search functionality",
	})
	.help()
	.version()
	.parse();

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

// TODO: Use chalk or custom utils to change this.
const prompt = "\x1b[38;2;204;204;204m›\x1b[0m ";

async function sendMessage(message: string): Promise<void> {
	messages.push({ role: "user", content: message });

	// Allow for conversation saving (eventually)
	let response = "";

	const spinner = ora({
		text: "Waiting for OpenAI...",
		discardStdin: false, // Need to find a better way to do this
	}).start();

	// TODO: Need to do some error catching for models that don't support reasoning or web search.
	const completion = await openai.responses.create({
		model: argv.model,
		temperature: argv.temperature,
		stream: true,
		input: messages,
		reasoning: {
			effort: argv.reasoningEffort as "low" | "medium" | "high",
			summary: argv.reasoningSummary as "detailed" | "auto" | "concise",
		},
		tools: !argv.disableWebSearch
			? [{ type: "web_search_preview" as const }]
			: [],
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

	process.stdout.write("\n");

	if (!argv.disableChat) {
		console.log();
		process.stdout.write(prompt);
	}
}

// If input is provided, process it first
if (argv.input && argv.input.trim()) {
	await sendMessage(argv.input);
} else {
	process.stdout.write(prompt);
}

if (!argv.disableChat) {
	for await (const line of console) {
		if (line == null) break;
		await sendMessage(line);
	}
}

process.exit(0);
