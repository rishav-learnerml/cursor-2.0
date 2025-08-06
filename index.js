import { GoogleGenAI } from "@google/genai";
import readlineSync from "readline-sync";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";
import dotenv from "dotenv";

dotenv.config();

const asyncExecute = promisify(exec);
const platform = os.platform();

const History = [];
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

//create tool

//can exeute any terminal or shell command

async function executeCommand({ command }) {
  try {
    const { stdout, stderr } = await asyncExecute(command);
    if (stderr) {
      return `Error: ${stderr}`;
    }

    return `Success: ${stdout} || Task executed successfully`;
  } catch (error) {
    return `Error executing command: ${error.message || error}`;
  }
}

const executeCommandDeclaration = {
  name: "executeCommand",
  description:
    "Execute a single terminal or shell command. A command can be to create a folder, file, write to a file, or any other shell command.",
  parameters: {
    type: "OBJECT",
    properties: {
      command: {
        type: "STRING",
        description: `The shell or terminal command to execute, Ex. "mkdir calculator"`,
      },
    },
    required: ["command"],
  },
};

const availableTools = {
  executeCommand: executeCommand,
};

async function runAgent(userProblem) {
  History.push({
    role: "user",
    parts: [{ text: userProblem }],
  });

  while (true) {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: History,
      config: {
        systemInstruction: `You are an website builder expert. You have to create the forntend of the website using HTML, CSS, and JavaScript.
        
        current platform is ${platform}. You can use the executeCommand tool to execute any terminal or shell command. You can also use the executeCommand tool to create a folder, file, write to a file, or any other shell command.

        Give command to the user according to the platform. If the user asks for a command that is not supported by the platform, you can suggest an alternative command or ask the user to provide a different command.

        <--- What is your job? --->

        1: analyse the user query to see what type of website the user wants to build.
        2: Give them command one by one, step by step.
        3: Use avalable took executeCommand to execute the command.

        // You can give them command in following format:

        1. first craete a folder
        2. inside that folder create a file named index.html, Example: "touch index.html"
        3. Then create styles.css file, Example: "touch styles.css"
        4. Then create script.js file, Example: "touch script.js"
        5. Then write the HTML code in index.html file
        6. Then write the CSS code in styles.css file
        7. Then write the JavaScript code in script.js file

        You have to provide the terminal or shell command to user. They will directly execute it.

        <--- Important Notes for Writing File Content --->

        🔹 Do **not** use 'echo "..." > filename' to write content to files, as it may cause the terminal to hang or behave unexpectedly. DO NOT USE echo command at any cost!!!

        🔹 Instead, use alternate commands

        🔹 once the user asks a question DO NOT ask him back any question - directly execute tasks

        🔹 DO NOT USE ANY SPECIAL CHARACTERS LIKE '\n', '\`', * , ", ', \, /, etc. IN THE HTML or CSS or JS CONTENT. 

        VVI
        !!!!! DO NOT USE 'echo' command to write content to files. Use any other command to write content to files. !!!!!!

        `,
        tools: [
          {
            functionDeclarations: [executeCommandDeclaration],
          },
        ],
      },
    });

    if (response.functionCalls && response.functionCalls.length > 0) {
      console.log(response.functionCalls[0]);
      const { name, args } = response.functionCalls[0];

      const funCall = availableTools[name];
      const result = await funCall(args);

      const functionResponsePart = {
        name: name,
        response: {
          result: result,
        },
      };

      // model
      History.push({
        role: "model",
        parts: [
          {
            functionCall: response.functionCalls[0],
          },
        ],
      });

      // result Ko history daalna

      History.push({
        role: "user",
        parts: [
          {
            functionResponse: functionResponsePart,
          },
        ],
      });
    } else {
      History.push({
        role: "model",
        parts: [{ text: response.text }],
      });
      console.log(response.text);
      break;
    }
  }
}

async function main() {
  console.log(
    "I am a website builder expert. I can help you build a website using HTML, CSS, and JavaScript. Let's create a website together!"
  );
  const userProblem = readlineSync.question("Ask me anything--> ");
  await runAgent(userProblem);
  main();
}

main();
