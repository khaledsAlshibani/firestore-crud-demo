#!/usr/bin/env node
/**
 * Interactive Firestore REPL: type snippets using the modular API (like addDoc, getDocs).
 * Commands: `exit` / `quit` / `.exit`: leave and close the connection.
 * Several lines: end with \\ to continue on the next line.
 */
import readline from "node:readline";
import util from "node:util";
import db from "./firebase.js";
import * as firestore from "firebase/firestore";

const tty = process.stdout.isTTY;

const S = {
  R: tty ? "\x1b[0m" : "",
  dim: tty ? "\x1b[2m" : "",
  red: tty ? "\x1b[31m" : "",
  green: tty ? "\x1b[32m" : "",
  yellow: tty ? "\x1b[33m" : "",
  brandBg: tty ? "\x1b[44m" : "",
  brandFg: tty ? "\x1b[1;97m" : "",
  promptDim: tty ? "\x1b[2;37m" : "",
  promptMark: tty ? "\x1b[32m" : "",
};

function rlAnsi(seq) {
  return tty ? `\x01${seq}\x02` : "";
}

const PROMPT = tty
  ? `${rlAnsi(S.promptDim)}firestore${rlAnsi(S.R)}${rlAnsi(S.promptMark)}>${rlAnsi(S.R)} `
  : "firestore> ";

const CONTINUE_PROMPT = tty
  ? `${rlAnsi("\x1b[2;36m")}    ...>${rlAnsi(S.R)} `
  : "    ...> ";

function clearTerminal() {
  if (!tty) return;
  process.stdout.write("\x1b[3J\x1b[2J\x1b[H");
}

function printBrandBar() {
  if (!tty) {
    console.log("firestore repl");
    return;
  }
  const label = "  \u25C6  firestore repl  ";
  const cols = process.stdout.columns ?? 80;
  const pad = Math.max(0, cols - label.length);
  process.stdout.write(
    `${S.brandBg}${S.brandFg}${label}${" ".repeat(pad)}${S.R}\n\n`
  );
}

function printTagline() {
  const gap = `${S.dim}  `;
  console.log(`${S.dim}  modular Firestore shell · v9 API${S.R}

${S.dim}  ${S.yellow}help${gap}paste examples from the docs
${S.dim}  ${S.yellow}clear${gap}${S.yellow}cls${gap}wipe the screen (not JavaScript, built in)
${S.dim}  ${S.yellow}exit${gap}${S.yellow}quit${gap}${S.yellow}.exit${S.dim}${S.R}
`);
}

function printExamples() {
  const c = (text) => `${S.dim}  # ${text}${S.R}`;
  console.log(`
${S.dim}  examples  CRUD on ${S.green}users/user1${S.dim} (run in order if you want a clean flow)${S.R}

${c("CREATE: setDoc, fixed id users/user1")}
  ${S.green}await setDoc(doc(db, "users", "user1"), { name: "Ali", age: 25 })${S.R}

${c("READ: getDoc, print .data()")}
  ${S.green}console.log((await getDoc(doc(db, "users", "user1"))).data())${S.R}

${c("UPDATE: updateDoc, merge fields")}
  ${S.green}await updateDoc(doc(db, "users", "user1"), { age: 30 })${S.R}

${c("DELETE: deleteDoc")}
  ${S.green}await deleteDoc(doc(db, "users", "user1"))${S.R}

${c("long line? end with backslash, continue on the next line")}
`);
}

function paintStartup() {
  clearTerminal();
  printBrandBar();
  printTagline();
}

function paintHelp() {
  clearTerminal();
  printBrandBar();
  printTagline();
  printExamples();
}

const {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  writeBatch,
  runTransaction,
  Timestamp,
  increment,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  terminate,
} = firestore;

const bindings = {
  db,
  firestore,
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  writeBatch,
  runTransaction,
  Timestamp,
  increment,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
};

const paramNames = Object.keys(bindings);

function buildRunner(code) {
  const body = `
    "use strict";
    return (async () => {
      ${code}
    })();
  `;
  return new Function(...paramNames, body)(...paramNames.map((k) => bindings[k]));
}

async function repl() {
  paintStartup();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: PROMPT,
    terminal: true,
  });

  let buffer = "";
  let exiting = false;

  const runLine = async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    if (lower === "exit" || lower === "quit" || lower === ".exit") {
      exiting = true;
      rl.close();
      return;
    }
    if (lower === "help" || lower === "?") {
      paintHelp();
      return;
    }
    if (
      lower === "clear" ||
      lower === "cls" ||
      lower === "clc" ||
      lower === "clear screen"
    ) {
      clearTerminal();
      return;
    }
    try {
      const pending = buffer + line;
      if (/\\\s*$/.test(line)) {
        buffer = pending.replace(/\\\s*$/, "\n");
        rl.setPrompt(CONTINUE_PROMPT);
        return;
      }
      buffer = "";
      rl.setPrompt(PROMPT);
      const code = pending;
      const result = await buildRunner(code);
      if (result !== undefined) {
        console.log(
          util.inspect(result, { colors: tty, depth: 8, maxArrayLength: 100 })
        );
      }
    } catch (err) {
      console.error(`${S.red}${err && err.stack ? err.stack : err}${S.R}`);
    }
  };

  rl.prompt();
  for await (const line of rl) {
    await runLine(line);
    if (exiting) break;
    rl.prompt();
  }

  try {
    await terminate(db);
  } catch {
    // ignore shutdown races
  }
  if (tty) console.log(`\n${S.dim}  ok, later${S.R}\n`);
  else console.log("\nok, later\n");
}

repl().catch((err) => {
  console.error(`${S.red}${err && err.stack ? err.stack : err}${S.R}`);
  process.exitCode = 1;
});
